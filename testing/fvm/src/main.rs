use fvm_integration_tests::tester::{Account, Tester};
use fvm_shared::message::Message;
use fvm_shared::state::StateTreeVersion;
use fvm_shared::version::NetworkVersion;
use fvm::executor::{ApplyKind, Executor};
use fvm_ipld_blockstore::MemoryBlockstore;
use fvm_ipld_encoding::tuple::*;
use fvm_ipld_encoding::RawBytes;
use fvm_shared::address::Address;
use fvm_shared::bigint::BigInt;
use std::env;
use std::collections::hash_map::HashMap;

const WASM_COMPILED_PATH: &str =
    "../fil-erc20-actor.wasm";

// The state object
#[derive(Serialize_tuple, Deserialize_tuple, Clone, Debug, Default)]
pub struct State {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub balances: HashMap<String, u64>,
    pub allowed: HashMap<String, u64>,
}

fn main() {
    println!("Testing ERC20 actor in assembly script");

    let mut tester = Tester::new(
        NetworkVersion::V16,
        StateTreeVersion::V4,
        MemoryBlockstore::default(),
    )
    .unwrap();

    let sender: [Account; 1] = tester.create_accounts().unwrap();

    let wasm_path = env::current_dir()
    .unwrap()
    .join(WASM_COMPILED_PATH)
    .canonicalize()
    .unwrap();
    let wasm_bin = std::fs::read(wasm_path).expect("Unable to read file");

    let actor_state = State { 
        name: "Zondax coin".to_string(),
        symbol: "ZDX".to_string(),
        decimals: 8,
        total_supply: 1_000_000,
        balances: HashMap::new(),
        allowed: HashMap::new(),
    };
    let state_cid = tester.set_state(&actor_state).unwrap();

    // Set actor
    let actor_address = Address::new_id(10000);

    tester
        .set_actor_from_bin(&wasm_bin, state_cid, actor_address, BigInt::default())
        .unwrap();

    let actor = tester.state_tree.as_ref().unwrap().get_actor(&actor_address).unwrap().unwrap();
    let state = tester.blockstore().clone().get(&actor.state).unwrap();
    println!("Cbor hex state : {}", hex::encode(state.unwrap()));

    // Instantiate machine
    tester.instantiate_machine().unwrap();

    let executor = tester.executor.as_mut().unwrap();

    println!("Calling `GetName`");

    let message = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 2,
        ..Message::default()
    };

    let res = executor
        .execute_message(message, ApplyKind::Explicit, 100)
        .unwrap();

    dbg!(&res);

    assert_eq!(res.msg_receipt.exit_code.value(), 0);

    println!("Calling `GetSymbol`");

    let message = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 3,
        sequence: 1,
        ..Message::default()
    };

    let res = executor
        .execute_message(message, ApplyKind::Explicit, 100)
        .unwrap();

    dbg!(&res);

    assert_eq!(res.msg_receipt.exit_code.value(), 0);
}
