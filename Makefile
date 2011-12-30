test:
	test/run

hint:
	jshint lib/codie.js test/codie-test.js test/run

dist:
	mkdir -p dist
	cp -r lib CHANGELOG LICENSE README.md VERSION package.json dist

distclean:
	rm -rf dist

.PHONY: test hint dist distclean
.SILENT: test hint dist distclean
