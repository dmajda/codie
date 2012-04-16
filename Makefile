# Run the test suite
test:
	test/run

# Run JSHint on the source
hint:
	jshint lib/codie.js test/codie-test.js test/run

# Prepare dstribution files
dist:
	mkdir -p dist
	cp -r lib CHANGELOG LICENSE README.md VERSION package.json dist

# Remove distribution file (created by "dist")
distclean:
	rm -rf dist

.PHONY: test hint dist distclean
.SILENT: test hint dist distclean
