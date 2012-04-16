/*
 * Codie 1.0.1
 *
 * https://github.com/dmajda/codie
 *
 * Copyright (c) 2011-2012 David Majda
 * Licensend under the MIT license.
 */
(function(undefined) {

function stringEscape(s) {
  function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

  /*
   * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
   * string literal except for the closing quote character, backslash,
   * carriage return, line separator, paragraph separator, and line feed.
   * Any character may appear in the form of an escape sequence.
   *
   * For portability, we also escape escape all control and non-ASCII
   * characters. Note that "\0" and "\v" escape sequences are not used
   * because JSHint does not like the first and IE the second.
   */
  return s
    .replace(/\\/g,   '\\\\') // backslash
    .replace(/"/g,    '\\"')  // closing double quote
    .replace(/\x08/g, '\\b')  // backspace
    .replace(/\t/g,   '\\t')  // horizontal tab
    .replace(/\n/g,   '\\n')  // line feed
    .replace(/\f/g,   '\\f')  // form feed
    .replace(/\r/g,   '\\r')  // carriage return
    .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
    .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
    .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
    .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
}

function push(s) { return '__p.push(' + s + ');'; }

function pushRaw(template, length, state) {
  function unindent(code, level, unindentFirst) {
    return code.replace(
      new RegExp('^.{' + level +'}', "gm"),
      function(str, offset) {
        if (offset === 0) {
          return unindentFirst ? '' : str;
        } else {
          return "";
        }
      }
    );
  }

  var escaped = stringEscape(unindent(
        template.substring(0, length),
        state.indentLevel(),
        state.atBOL
      ));

  return escaped.length > 0 ? push('"' + escaped + '"') : '';
}


var Codie = {
  /*
   * Specifies by how many characters do #if/#else and #for unindent their
   * content in the generated code.
   */
  indentStep: 2,

  /* Description of #-commands. Extend to define your own commands. */
  commands: {
    "if":   {
      params:  /^(.*)$/,
      compile: function(state, prefix, params) {
        return ['if(' + params[0] + '){', []];
      },
      stackOp: "push"
    },
    "else": {
      params:  /^$/,
      compile: function(state) {
        var stack = state.commandStack,
            insideElse = stack[stack.length - 1] === "else",
            insideIf   = stack[stack.length - 1] === "if";

        if (insideElse) { throw new Error("Multiple #elses."); }
        if (!insideIf)  { throw new Error("Using #else outside of #if."); }

        return ['}else{', []];
      },
      stackOp: "replace"
    },
    "for":  {
      params:  /^([a-zA-Z_][a-zA-Z0-9_]*)[ \t]+in[ \t]+(.*)$/,
      init:    function(state) {
        state.forCurrLevel = 0;  // current level of #for loop nesting
        state.forMaxLevel  = 0;  // maximum level of #for loop nesting
      },
      compile: function(state, prefix, params) {
        var c = '__c' + state.forCurrLevel, // __c for "collection"
            l = '__l' + state.forCurrLevel, // __l for "length"
            i = '__i' + state.forCurrLevel; // __i for "index"

        state.forCurrLevel++;
        if (state.forMaxLevel < state.forCurrLevel) {
          state.forMaxLevel = state.forCurrLevel;
        }

        return [
          c + '=' + params[1] + ';'
            + l + '=' + c + '.length;'
            + 'for(' + i + '=0;' + i + '<' + l + ';' + i + '++){'
            + params[0] + '=' + c + '[' + i + '];',
          [params[0], c, l, i]
        ];
      },
      exit:    function(state) { state.forCurrLevel--; },
      stackOp: "push"
    },
    "end":  {
      params:  /^$/,
      compile: function(state) {
        var stack = state.commandStack, exit;

        if (stack.length === 0) { throw new Error("Too many #ends."); }

        exit = Codie.commands[stack[stack.length - 1]].exit;
        if (exit) { exit(state); }

        return ['}', []];
      },
      stackOp: "pop"
    },
    "block": {
      params: /^(.*)$/,
      compile: function(state, prefix, params) {
        var x = '__x', // __x for "prefix",
            n = '__n', // __n for "lines"
            l = '__l', // __l for "length"
            i = '__i'; // __i for "index"

        /*
         * Originally, the generated code used |String.prototype.replace|, but
         * it is buggy in certain versions of V8 so it was rewritten. See the
         * tests for details.
         */
        return [
          x + '="' + stringEscape(prefix.substring(state.indentLevel())) + '";'
            + n + '=(' + params[0] + ').toString().split("\\n");'
            + l + '=' + n + '.length;'
            + 'for(' + i + '=0;' + i + '<' + l + ';' + i + '++){'
            + n + '[' + i +']=' + x + '+' + n + '[' + i + ']+"\\n";'
            + '}'
            + push(n + '.join("")'),
          [x, n, l, i]
        ];
      },
      stackOp: "nop"
    }
  },

  /*
   * Compiles a template into a function. When called, this function will
   * execute the template in the context of an object passed in a parameter and
   * return the result.
   */
  template: function(template) {
    var stackOps = {
      push:    function(stack, name) { stack.push(name); },
      replace: function(stack, name) { stack[stack.length - 1] = name; },
      pop:     function(stack)       { stack.pop(); },
      nop:     function()            { }
    };

    function compileExpr(state, expr) {
      state.atBOL = false;
      return [push(expr), []];
    }

    function compileCommand(state, prefix, name, params) {
      var command, match, result;

      command = Codie.commands[name];
      if (!command) { throw new Error("Unknown command: #" + name + "."); }

      match = command.params.exec(params);
      if (match === null) {
        throw new Error(
          "Invalid params for command #" + name + ": " + params + "."
        );
      }

      result = command.compile(state, prefix, match.slice(1));
      stackOps[command.stackOp](state.commandStack, name);
      state.atBOL = true;
      return result;
    }

    var state = {               // compilation state
          commandStack: [],     //   stack of commands as they were nested
          atBOL:        true,   //   is the next character to process at BOL?
          indentLevel:  function() {
            return Codie.indentStep * this.commandStack.length;
          }
        },
        code = '',              // generated template function code
        vars = ['__p=[]'],      // variables used by generated code
        name, match, result, i;

    /* Initialize state. */
    for (name in Codie.commands) {
      if (Codie.commands[name].init) { Codie.commands[name].init(state); }
    }

    /* Compile the template. */
    while ((match = /^([ \t]*)#([a-zA-Z_][a-zA-Z0-9_]*)(?:[ \t]+([^ \t\n][^\n]*))?[ \t]*(?:\n|$)|#\{([^}]*)\}/m.exec(template)) !== null) {
      code += pushRaw(template, match.index, state);
      result = match[2] !== undefined && match[2] !== ""
        ? compileCommand(state, match[1], match[2], match[3] || "") // #-command
        : compileExpr(state, match[4]);                             // #{...}
      code += result[0];
      vars = vars.concat(result[1]);
      template = template.substring(match.index + match[0].length);
    }
    code += pushRaw(template, template.length, state);

    /* Check the final state. */
    if (state.commandStack.length > 0) { throw new Error("Missing #end."); }

    /* Sanitize the list of variables used by commands. */
    vars.sort();
    for (i = 0; i < vars.length; i++) {
      if (vars[i] === vars[i - 1]) { vars.splice(i--, 1); }
    }

    /* Create the resulting function. */
    return new Function("__v", [
      '__v=__v||{};',
      'var ' + vars.join(',') + ';',
      'with(__v){',
      code,
      'return __p.join("").replace(/^\\n+|\\n+$/g,"");};'
    ].join(''));
  }
};

if (typeof module === "object") {
  module.exports = Codie;
} else if (typeof window === "object") {
  window.Codie = Codie;
} else {
  throw new Error("Can't export Codie library (no \"module\" nor \"window\" object detected).");
}

})();
