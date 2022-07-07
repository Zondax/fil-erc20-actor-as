deps:
	yarn install
	cargo install wizer --all-features --force

build:
	yarn asbuild
	wizer build/release.wasm -f init -o build/release-final.wasm

test:
	cd testing/fvm && cargo r

test-rpc: build
	yarn tests:rpc

.PHONY: deps build test
