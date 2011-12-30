test:
	test/run

hint:
	jshint lib/codie.js test/codie-test.js test/run

.PHONY: test hint
.SILENT: test hint
