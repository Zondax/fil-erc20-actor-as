deps:
	yarn install
	cargo install wizer --all-features --force

build:
	yarn asbuild
	wizer build/release.wasm -f init -o build/release-final.wasm

test:
	cd tests/local-vm && cargo r

test-rpc: build
	yarn tests:rpc

.PHONY: deps build test
