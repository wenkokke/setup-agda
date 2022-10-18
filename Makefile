CONFIG=$(wildcard ./*.json)
SOURCE=$(shell find ./src \( -name '*.json' -or -name '*.ts' \))
LIBS=$(subst src,lib,$(SOURCE:.ts=.js))
DIST=dist/index.js dist/index.js.map dist/licenses.txt sourcemap-register.js

.PHONY: build
build: $(LIBS)
$(LIBS): $(CONFIG) $(SOURCE)
	npm run build

.PHONY: package
package: $(LIBS)
$(DIST): $(CONFIG) $(LIBS)
	npm run package

.PHONY: update-haskell-info
update-haskell-info: ./src/package-info/Haskell.versions.json
./src/package-info/Haskell.versions.json: ./vendor/haskell/actions/setup/src/versions.json
	cp $< $@
