deps:
	yarn install
	cargo install wizer --all-features

build:
	yarn asbuild
	wizer build/release.wasm -f init -o fil-erc20-actor.wasm

test:
	cd testing/fvm && cargo r

test-rpc: build
	yarn tests:rpc

.PHONY: deps build test
