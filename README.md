Codie
=====

Codie is a simple JavaScript template engine specialized in generating code. Unlike other engines it really cares about newlines and indentation, allowing both the template and the generated code to be readable at the same time. You can use Codie to write tools such as compilers, template engines, various kinds of preprocessors or transformers — anything that produces more than a few lines of JavaScript.

Example
-------

Codie template looks like this:

    #for i in list
      alert("Processing #{i}.");
      #if i % 2 == 0
        alert("#{i} is even.");
      #else
        alert("#{i} is odd.");
      #end
    #end

With `{ list: [1, 2, 3] }` as data, this template produces:

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

You need to install [Node.js](http://nodejs.org/) first. You can then install Codie:

    $ npm install codie

Do not install Codie globally (using the `-g` option), otherwise you won’t be able to use the API.

### Browser

Download the `lib/codie.js` file and include it in your web page or application using the `<script>` tag.

Usage
-----

In Node.js, require the Codie module:

    var Codie = require("codie");

In browser, include the Codie library in your web page or application using the `<script>` tag. Codie will be available via the `Codie` global object.

Using a template is a two-step process. First you need to compile the template text into a template function. Then you need to call this function with data to be filled into the template. Compiling saves time when you use the same template multiple times.

To compile a template, call the `Codie.template` method and pass the template text as a parameter. The method will return a template function or throw an exception if the template text is invalid:

    var template = Codie.template('var #{name} = #{value};');

To fill the template, call the template function and pass an object with data. It’s properties will be available as variables in the template. The template function will return the filled template:

    template({ name: "result", value: 42}); // Returns "var result = 42;".

To fill the template with different values, just call the template function again with a different data.

Template Syntax
---------------

The template is a string with embedded *expressions* and *commands*. Any text which is not an expression nor a command is just copied verbatim to the output.

### Expressions

Expressions are just regular JavaScript expressions wrapped into `#{` and `}`. They are evaluated and the result is emitted to the output.

### Commands

Commands start with a `#` character at the beginning of a line, prefixed only by optional whitespace, and followed by the command name and parameters (if any) separated by whitespace.

The following commands are available:

#### #for / #end

Emits code in its body repeatedly, assigning values from an array to the loop variable sequentially.

    #for i in list
      #{i}
    #end

With `{ list: [1, 2, 3] }` as data, this template produces:

    1
    2
    3

All lines in the loop body are unindented by `Codie.indentStep` characters in the output. This is necessary to allow  indentation to be used in the template and to make it disappear in the generated output.

#### #if / #else / #end

Emits code in one of its branches depending on the condition.

    #if i % 2 == 0
      alert("#{i} is even.");
    #else
      alert("#{i} is odd.");
    #end

With `{ i: 42 }` as data, this template produces:

    alert("42 is even.");

All lines in the loop body are unindented by `Codie.indentStep` characters in the output. This is necessary to allow  indentation to be used in the template and to make it disappear in the generated output.

The `#else` branch is optional.

#### #block

Evaluates its parameter, converts it to a string using the `toString` method, indents the result to the same level as the `#block` command and emits the result.

    function foo() {
      #block body
    }

With `{ body: "bar();\nbaz();" }` as data, this template produces:

    function foo() {
      bar();
      baz();
    }

This command is useful mainly to combine parts of the generated output together.

### More information

For more details about the syntax see the source code.

Customization
-------------

Unindenting inside `#if` and `#for` commands removes `Codie.indentStep` characters from the beginning of lines. This property is set to `2` by default. You can modify it to use a different indentation level. Note that Codie does not care whether you use tabs or spaces for indentation.

Extension
---------

Codie is designed to be extensible, so it’s easy to add new commands. All commands are described by descriptors stored in properties of the `Codie.commands` object. To add a new command, just add its descriptor there. See the implementation of other commands and the `compileCommand` function to get an idea how commands work.

FAQ
---

**Why did you choose "#" as a command and expression delimiter?**

I experimented with various means of delimiting. After a while I settled on line-oriented syntax with one-character delimiter. At that point, the "#" character won because it is easily recognizable, it’s not used in JavaScript, and commands prefixed by it resemble C preprocessor.

The only downside is that it is also used for interpolation in CoffeeScript. Should this be a problem, I’ll make the delimiter configurable.

Compatibility
-------------

Codie should run well in the following environments:

  * Node.js 0.6.6+
  * IE 8+
  * Firefox
  * Chrome
  * Safari
  * Opera

Development
-----------

Codie is developed by [David Majda](http://majda.cz/) ([@dmajda](http://twitter.com/dmajda)). You are welcome to contribute code. Unless your contribution is really trivial you should get in touch with me first — this can prevent wasted effort on both sides. You can send code both as a patch or a GitHub pull request.
