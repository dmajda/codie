Codie
=====

Codie is a JavaScript template engine specialized in generating JavaScript code. You can use it to write tools such as compilers, template engines, various kinds of preprocessors or transformers — anything that produces more than few lines of JavaScript.

Originally, I wrote Codie to improve the code generator in [PEG.js](http://pegjs.majda.cz/). But because lot of software needs to generate JavaScript these days, Codie can be useful much more widely. Using it, you can avoid generating code by string concatenation or similar messy means and produce JavaScript in a readable, maintainable way.

Features
--------

  * **Simplicity** — it does one thing well and nothing more
  * **Readability** — correct indentation is maintained in generated code
  * **Speed** — templates are precompiled into functions
  * **Extensibility** — you can add your own commands in no time

Example
-------

Sample template:

    #for i in list
      alert("Processing #{i}.");
      #if i % 2 == 0
        alert("#{i} is even.");
      #else
        alert("#{i} is odd.");
      #end
    #end

When passed `{ list: [1, 2, 3] }` as environment, the template produces the following code:

    alert("Processing 1.");
    alert("1 is odd.");
    alert("Processing 2.");
    alert("2 is even.");
    alert("Processing 3.");
    alert("3 is odd.");

Note that all `alert` calls are on the same indentation level (unlike in the template) because all indentation related to the #-commands is stripped.

Installation
------------

### Node.js

You need to install [Node.js](http://nodejs.org/) and [npm](http://npmjs.org/) first. You can then install Codie:

    $ npm install codie

Do not install Codie globally (using the `-g` option), otherwise you won’t be able to use the API.

### Browser

Download the `lib/codie.js` file and include it in your web page or application using the `<script>` tag.

Usage
-----

In Node.js, require the Codie module:

    var Codie = require("codie");

In browser, include the Codie library in your web page or application using the `<script>` tag. Codie will be available via the `Codie` global object.

To create a template, call the `Codie.template` method and pass the template text as a parameter. The method will return a template function or throw an exception is the template text is invalid:

    var template = Codie.template('var #{name} = #{value};');

To fill the template, call the template function and specify the environment object — a context in which the template will be evaluated. It’s properties will be available as variables in the template. The template function will return the generated code:

    template({ name: "result", value: 42}); // returns "var result = 42;"

To fill the template with different values, just call the template function again with a different environment.

Template Syntax
---------------

The template is a string with embedded *commands* and *expressions*. Any text which is not a command nor an expression is just copied verbatim to the generated code.

### Commands

A command starts with a `#` character followed by the command name and parameters (if any) separated by whitespace. The command always starts at the beginning of a line, prefixed only by optional whitespace, and ends at the end of a line. The following commands are available:

#### #for / #end

Loops over an array and emits code in its body repeatedly (each time with different loop variable value).

Example:

    #for i in list
      #{i}
    #end

When passed `{ list: [1, 2, 3] }` as environment it produces:

    1
    2
    3

All lines in the loop body are unindented by `Codie.indentStep` characters. This is necessary so that indentation can be used for template commands but disappears in the generated code at the same time.

#### #if / #else / #end

Emits code in one of its branches depending on the condition.

Example:

    #if i % 2 == 0
      alert("#{i} is even.");
    #else
      alert("#{i} is odd.");
    #end

When passed `{ i: 42 }` as environment it produces:

    alert("42 is even.");

All lines in the loop body are unindented by `Codie.indentStep` characters. This is necessary so that indentation can be used for template commands but disappears in the generated code at the same time.

The `#else` branch is optional.

#### #block

Evaluates its parameter, converts it to string using the `toString` method, indents the result to the same level as the `#block` command and emits the result.

Example:

    function foo() {
      #block body
    }

When passed `{ body: "bar();\nbaz();" }` as environment it produces:

    function foo() {
      bar();
      baz();
    }

### Expressions

Expressions can only be used on non-command lines. They are just regular JavaScript expressions wrapped into `#{` and `}`. They are evaluated and the result is emitted.

### More information

For more details about the syntax see the source code.

Customization and Extension
---------------------------

By default, unindenting inside `#if` and `#for` commands removes two characters from the beginning of lines. This number is specified in the `Codie.indentStep` property. If you want to use a different indentation level, modify it accordingly. Note that Codie does not care if you use tabs or spaces for indentation.

Codie is designed to be extensible, so it’s easy to add new commands. All commands are described by objects stored in `Codie.commands` hash. To add a new command, just add its descriptor there. See the implementation of other commands and the `compileCommand` function to get an idea how commands work.

FAQ
---

**Why did you choose "#" as a command and expression delimiter?**

I experimented with various means of delimiting. After a while I settled on line-oriented syntax with one-character delimiter. At that point, the "#" character won because it is easily recognizable, it’s not used in JavaScript and commands prefixed by it resemble C preprocessor.

The only downside is that it is also used for interpolation in CoffeeScript. Should this be a problem, I’ll make the delimiter configurable.

Compatibility
-------------

Both the parser generator and generated parsers should run well in the following environments:

  * Node.js 0.4.11+
  * IE 8+
  * Firefox
  * Chrome
  * Safari
  * Opera

Development
-----------

Codie is developed by [David Majda](http://majda.cz/) ([@dmajda](http://twitter.com/dmajda)). You are welcome to contribute code. Unless your contribution is really trivial you should get in touch with me first — this can prevent wasted effort on both sides. You can send code both as a patch or a GitHub pull request.
