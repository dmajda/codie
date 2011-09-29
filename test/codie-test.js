module("Codie.template");

var evals = function(template, result, vars) {
  strictEqual(Codie.template(template)(vars), result);
};

var raisesWithMessage = function(block, constructor, message) {
  raises(
    block,
    function(e) { return e instanceof constructor && e.message === message; }
  );
};

test("simple strings", function() {
  evals('',                  '');
  evals('one line',          'one line');
  evals('some\nmore\nlines', 'some\nmore\nlines');
  evals(
   '"\r\n\x00\x07\x0B\x0E\x0F\x10\x1F\x80\xFF\u0100\u0FFF\u1000\uFFFF"\r\n\x00\x07\x0B\x0E\x0F\x10\x1F\x80\xFF\u0100\u0FFF\u1000\uFFFF',
   '"\r\n\x00\x07\x0B\x0E\x0F\x10\x1F\x80\xFF\u0100\u0FFF\u1000\uFFFF"\r\n\x00\x07\x0B\x0E\x0F\x10\x1F\x80\xFF\u0100\u0FFF\u1000\uFFFF'
  );
});

test("trimming", function() {
  evals('\nfoo',     'foo');
  evals('\n\n\nfoo', 'foo');
  evals('foo\n',     'foo');
  evals('foo\n\n\n', 'foo');
  evals('\nfoo\n',   'foo');
});

test("#{...}", function() {
  /* Simple interpolation */

  evals('#{1+2}',                 '3');
  evals('a#{1+2}',                'a3');
  evals('#{1+2}a',                '3a');
  evals('a#{1+2}b#{3+4}c#{5+6}d', 'a3b7c11d');

  /* Variables */

  evals('#{foo}', '42', { foo: 42 });
  evals(
    'foo = #{foo}, bar = #{bar}, baz = #{baz}',
    'foo = 42, bar = 43, baz = 44',
    { foo: 42, bar: 43, baz: 44 }
  );

  raises(function() { Codie.template('#{foo}')({ bar: 42 }); }, Error);
});

test("#if", function() {
  var savedIndentStep;

  /* Syntax */

  evals('#if true\n  foo\n#end',    'foo');
  evals(' #if true\n  foo\n#end',   'foo');
  evals('\t#if true\n  foo\n#end',  'foo');
  evals('   #if true\n  foo\n#end', 'foo');
  evals('#if\ttrue\n  foo\n#end',   'foo');
  evals('#if   true\n  foo\n#end',  'foo');
  evals('#if true \n  foo\n#end',   'foo');
  evals('#if true\t\n  foo\n#end',  'foo');
  evals('#if true   \n  foo\n#end', 'foo');

  evals('#if true\n  foo\n#else\n  bar\n#end',    'foo');
  evals('#if true\n  foo\n #else\n  bar\n#end',   'foo');
  evals('#if true\n  foo\n\t#else\n  bar\n#end',  'foo');
  evals('#if true\n  foo\n   #else\n  bar\n#end', 'foo');
  evals('#if true\n  foo\n#else \n  bar\n#end',   'foo');
  evals('#if true\n  foo\n#else\t\n  bar\n#end',  'foo');
  evals('#if true\n  foo\n#else   \n  bar\n#end', 'foo');

  raisesWithMessage(
    function() { Codie.template('#if true\n  foo\n#else params\n  bar\n#end'); },
    Error,
   "Invalid params for command #else: params."
  );

  /* Conditions */

  evals('#if true\n  foo\n#end',  'foo');
  evals('#if 1\n  foo\n#end',     'foo');
  evals('#if false\n  foo\n#end', '');
  evals('#if 0\n  foo\n#end',     '');

  evals('#if true\n  foo\n#else\n  bar\n#end',  'foo');
  evals('#if 1\n  foo\n#else\n  bar\n#end',     'foo');
  evals('#if false\n  foo\n#else\n  bar\n#end', 'bar');
  evals('#if 0\n  foo\n#else\n  bar\n#end',     'bar');

  /* Indentation */

  evals('  #if true\n    foo\n  #else\n    bar\n  #end',  '  foo');
  evals('  #if false\n    foo\n  #else\n    bar\n  #end', '  bar');

  /* Regression test: Tests correct indentation of multiple lines. */
  evals('#if true\n  foo\n  bar\n  baz\n#else\n  qux\n#end', 'foo\nbar\nbaz');
  evals('#if false\n  foo\n#else\n  bar\n  baz\n  qux\n#end', 'bar\nbaz\nqux');

  /* Regression test: Tests that strings between #{...} are not unindented. */
  evals([
    '#if true',
    '  #{1+2} + #{3+4} + #{5+6}',
    '#else',
    '  #{7+8} + #{9+10} + #{11+12}',
    '#end'
  ].join('\n'), '3 + 7 + 11');
  evals([
    '#if false',
    '  #{1+2} + #{3+4} + #{5+6}',
    '#else',
    '  #{7+8} + #{9+10} + #{11+12}',
    '#end'
  ].join('\n'), '15 + 19 + 23');

  savedIndentStep = Codie.indentStep;
  Codie.indentStep = 4;
  evals('#if true\n    foo\n#else\n    bar\n#end',  'foo');
  evals('#if false\n    foo\n#else\n    bar\n#end', 'bar');
  Codie.indentStep = savedIndentStep;

  /* Nesting */

  evals([
    '#if true',
    '  #if true',
    '    foo',
    '  #else',
    '    bar',
    '  #end',
    '#else',
    '  #if true',
    '    baz',
    '  #else',
    '    qux',
    '  #end',
    '#end'
  ].join('\n'), 'foo');
  evals([
    '#if false',
    '  #if true',
    '    foo',
    '  #else',
    '    bar',
    '  #end',
    '#else',
    '  #if true',
    '    baz',
    '  #else',
    '    qux',
    '  #end',
    '#end'
  ].join('\n'), 'baz');

  /* Variables */

  evals(
    '#if cond\n  #{foo}\n#else\n  #{bar}\n#end',
    'foo',
    { cond: true, foo: "foo", bar: "bar" }
  );
  evals(
    '#if cond\n  #{foo}\n#else\n  #{bar}\n#end',
    'bar',
    { cond: false, foo: "foo", bar: "bar" }
  );

  raises(
    function() {
      Codie.template('#if cond\n  foo\n#else\n  bar\n#end')({});
    },
    Error
  );

  /* Error handling */

  raisesWithMessage(
    function() { Codie.template('#else'); },
    Error,
    "Using #else outside of #if."
  );
  raisesWithMessage(
    function() { Codie.template('#for a in [42, 43, 44]\n#else\n#end'); },
    Error,
    "Using #else outside of #if."
  );
  raisesWithMessage(
    function() {
      Codie.template('#if true\n  foo\n#else\n  bar\n#else\n  baz\n#end');
    },
    Error,
    "Multiple #elses."
  );
});

test("#for", function() {
  var savedIndentStep;

  /* Syntax */

  evals('#for a in [42, 43, 44]\n  #{a}\n#end',         '42\n43\n44');
  evals('#for z in [42, 43, 44]\n  #{z}\n#end',         '42\n43\n44');
  evals('#for A in [42, 43, 44]\n  #{A}\n#end',         '42\n43\n44');
  evals('#for Z in [42, 43, 44]\n  #{Z}\n#end',         '42\n43\n44');
  evals('#for _ in [42, 43, 44]\n  #{_}\n#end',         '42\n43\n44');
  evals('#for aa in [42, 43, 44]\n  #{aa}\n#end',       '42\n43\n44');
  evals('#for az in [42, 43, 44]\n  #{az}\n#end',       '42\n43\n44');
  evals('#for aA in [42, 43, 44]\n  #{aA}\n#end',       '42\n43\n44');
  evals('#for aZ in [42, 43, 44]\n  #{aZ}\n#end',       '42\n43\n44');
  evals('#for a_ in [42, 43, 44]\n  #{a_}\n#end',       '42\n43\n44');
  evals('#for abcd in [42, 43, 44]\n  #{abcd}\n#end',   '42\n43\n44');
  evals('#for a in\t[42, 43, 44]\n  #{a}\n#end',        '42\n43\n44');
  evals('#for a in   [42, 43, 44]\n  #{a}\n#end',       '42\n43\n44');
  evals('#for abcd in\t[42, 43, 44]\n  #{abcd}\n#end',  '42\n43\n44');
  evals('#for abcd in   [42, 43, 44]\n  #{abcd}\n#end', '42\n43\n44');

  /* Collections */

  evals('#for a in []\n  #{a}\n#end',           '');
  evals('#for a in [42, 43, 44]\n  #{a}\n#end', '42\n43\n44');

  /* Indentation */

  evals('  #for a in []\n    #{a}\n  #end',           '');
  evals('  #for a in [42, 43, 44]\n    #{a}\n  #end', '  42\n  43\n  44');

  /* Regression test: Tests correct indentation of multiple lines. */
  evals(
    '#for a in [42, 43, 44]\n  #{a}\n  #{a*2}\n#{a*3}\n#end',
    '42\n84\n126\n43\n86\n129\n44\n88\n132'
  );

  evals('#if true\n  foo\n  bar\n  baz\n#else\n  qux\n#end', 'foo\nbar\nbaz');
  evals('#if false\n  foo\n#else\n  bar\n  baz\n  qux\n#end', 'bar\nbaz\nqux');

  /* Regression test: Tests that strings between #{...} are not unindented. */
  evals([
    '#for a in [42, 43, 44]',
    '  #{a} + #{a*2} + #{a*3}',
    '#end'
  ].join('\n'), '42 + 84 + 126\n43 + 86 + 129\n44 + 88 + 132');

  savedIndentStep = Codie.indentStep;
  Codie.indentStep = 4;
  evals('#for a in []\n    #{a}\n#end',           '');
  evals('#for a in [42, 43, 44]\n    #{a}\n#end', '42\n43\n44');
  Codie.indentStep = savedIndentStep;

  /* Nesting */

  evals([
    '#for a in [42, 43, 44]',
    '  #for b in [45, 46, 47]',
    '    #{a + b}',
    '  #end',
    '#end'
  ].join('\n'), '87\n88\n89\n88\n89\n90\n89\n90\n91');

  /* Variables */

  evals(
    '#for a in coll\n  #{foo}#{a}\n#end',
    'foo42\nfoo43\nfoo44',
    { coll: [42, 43, 44], foo: "foo" }
  );

  raises(
    function() { Codie.template('#for a in coll\n  #{a}\n#end')({}); },
    Error
  );
});

test("#end", function() {
  /* Syntax */

  evals('#if true\n  foo\n#end\n',    'foo');
  evals('#if true\n  foo\n #end\n',   'foo');
  evals('#if true\n  foo\n\t#end\n',  'foo');
  evals('#if true\n  foo\n   #end\n', 'foo');
  evals('#if true\n  foo\n#end \n',   'foo');
  evals('#if true\n  foo\n#end\t\n',  'foo');
  evals('#if true\n  foo\n#end   \n', 'foo');

  raisesWithMessage(
    function() { Codie.template('#if true\n  foo\n#end params'); },
    Error,
    "Invalid params for command #end: params."
  );

  /* Error handling */

  raisesWithMessage(
    function() { Codie.template('#if true'); },
    Error,
    "Missing #end."
  );
  raisesWithMessage(
    function() { Codie.template('#end'); },
    Error,
    "Too many #ends."
  );
});

test("#block", function() {
  /* Syntax */

  evals('#block 1+2',    '3');
  evals(' #block 1+2',   ' 3');
  evals('\t#block 1+2',  '\t3');
  evals('   #block 1+2', '   3');
  evals('#block\t1+2',   '3');
  evals('#block   1+2',  '3');
  evals('#block 1+2 ',   '3');
  evals('#block 1+2\t',  '3');
  evals('#block 1+2   ', '3');

  /* Surroundings */

  evals('#block 1+2',    '3');
  evals('a\n#block 1+2', 'a\n3');
  evals('#block 1+2\na', '3\na');

  /* Indentation */

  evals('  #block "foo"',  '  foo');
  evals('  #block "foo\\nbar\\nbaz"',  '  foo\n  bar\n  baz');

  /* Nesting */

  evals('#if true\n  #block 1+2\n#end', '3');

  /* Variables */

  evals('#block foo', '42', { foo: 42 });

  raises(function() { Codie.template('#block foo')({ bar: 42 }); }, Error);
});

test("#-command nesting", function() {
  evals([
    '#for a in [42, 43, 44, 45, 46]',
    '  #if a % 2 === 0',
    '    #{a}',
    '  #end',
    '#end'
  ].join('\n'), '42\n44\n46');

  evals([
    '#if true',
    '  #for a in [42, 43, 44]',
    '    #{a}',
    '  #end',
    '#else',
    '  #for a in [45, 46, 47]',
    '    #{a}',
    '  #end',
    '#end'
  ].join('\n'), '42\n43\n44');
  evals([
    '#if false',
    '  #for a in [42, 43, 44]',
    '    #{a}',
    '  #end',
    '#else',
    '  #for a in [45, 46, 47]',
    '    #{a}',
    '  #end',
    '#end'
  ].join('\n'), '45\n46\n47');
});

test("unknown #-command", function() {
  raisesWithMessage(
    function() { Codie.template('#unknown'); },
    Error,
    "Unknown command: #unknown."
  );
});
