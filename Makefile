SOURCES=$(wildcard ./*.json) $(shell find ./src \( -name '*.json' -or -name '*.ts' \))
TARGETS=dist/index.js dist/index.js.map dist/licenses.txt sourcemap-register.js

$(TARGETS): $(SOURCES)
	npm run update-agda-info \
		&& npm run update-haskell-info \
		&& npm run format \
		&& npm run lint \
		&& npm run build \
		&& npm run package
