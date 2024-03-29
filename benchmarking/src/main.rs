use fvm::executor::ApplyRet;
use fvm::executor::{ApplyKind, Executor};
use fvm_integration_tests::tester::{Account, Tester};
use fvm_ipld_blockstore::Blockstore;
use fvm_ipld_blockstore::MemoryBlockstore;
use fvm_ipld_encoding::tuple::*;
use fvm_ipld_encoding::RawBytes;
use fvm_shared::address::Address;
use fvm_shared::bigint::{BigInt, Integer};
use fvm_shared::message::Message;
use fvm_shared::state::StateTreeVersion;
use fvm_shared::version::NetworkVersion;
use std::collections::hash_map::HashMap;
use std::env;
use std::fs;

#[macro_use]
extern crate prettytable;
use prettytable::Table;

const AS_INCREMENTAL_WASM_COMPILED_PATH: &str = "./temp/as-incremental-erc20-actor.wasm";

const AS_MINIMAL_WASM_COMPILED_PATH: &str = "./temp/as-minimal-erc20-actor.wasm";

const AS_STUB_WASM_COMPILED_PATH: &str = "./temp/as-stub-erc20-actor.wasm";

const GO_WASM_COMPILED_PATH: &str = "./temp/go-erc20-actor.wasm";

/// The state object.
#[derive(Serialize_tuple, Deserialize_tuple, Clone, Debug, Default)]
pub struct State {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub balances: HashMap<String, u64>,
    pub allowed: HashMap<String, u64>,
}

#[derive(Serialize_tuple, Deserialize_tuple, Clone, Debug, Default)]
pub struct BalanceOfParams {
    pub address: String,
}

pub struct TransferParams {
    pub receiver_addr: String,
    pub transfer_amount: u64,
}

pub struct AllowanceParams {
    pub wallet_addr: String,
    pub new_allowance: u64,
}

pub struct TransferFromParams {
    pub owner_addr: String,
    pub receiver_addr: String,
    pub transfer_amount: u64,
}

fn percentage(a: i64, b: i64) -> i64 {
    let a_float = a as f64;
    let b_bloat = b as f64;

    ((a_float - b_bloat) / b_bloat * 100.0) as i64
}

fn run_fvm(path: &str) -> Vec<ApplyRet> {
    let mut result: Vec<ApplyRet> = Vec::new();
    println!("Testing {}", path);

    let mut tester = Tester::new(
        NetworkVersion::V16,
        StateTreeVersion::V4,
        MemoryBlockstore::default(),
    )
    .unwrap();

    let sender: [Account; 3] = tester.create_accounts().unwrap();

    let wasm_path = env::current_dir()
        .unwrap()
        .join(path)
        .canonicalize()
        .unwrap();
    let wasm_bin = std::fs::read(wasm_path).expect("Unable to read file");

    let mut balances = HashMap::new();
    balances.insert(sender[0].1.to_string(), 1_000);
    balances.insert(sender[1].1.to_string(), 1_000);

    let actor_state = State {
        name: "ZondaxCoin".to_string(),
        symbol: "ZDX".to_string(),
        decimals: 8,
        total_supply: 1_000_000,
        balances,
        allowed: HashMap::new(),
    };
    let state_cid = tester.set_state(&actor_state).unwrap();

    // Set actor
    let actor_address = Address::new_id(10000);

    tester
        .set_actor_from_bin(&wasm_bin, state_cid, actor_address, BigInt::default())
        .unwrap();

    // Instantiate machine
    tester.instantiate_machine().unwrap();

    let executor = tester.executor.as_mut().unwrap();

    // Calling `GetName`

    let message_m2 = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 2,
        sequence: 0,
        ..Message::default()
    };

    let res_m2 = executor
        .execute_message(message_m2, ApplyKind::Explicit, 100)
        .unwrap();

    // assert_eq!(res_m2.msg_receipt.exit_code.value(), 0);

    result.push(res_m2);

    // Calling `GetSymbol`

    let message_m3 = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 3,
        sequence: 1,
        ..Message::default()
    };

    let res_m3 = executor
        .execute_message(message_m3, ApplyKind::Explicit, 100)
        .unwrap();

    // assert_eq!(res_m3.msg_receipt.exit_code.value(), 0);

    result.push(res_m3);

    // Calling `GetBalanceOf`

    let params = BalanceOfParams {
        address: sender[0].1.to_string(),
    };

    let message_m6 = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 6,
        sequence: 2,
        params: RawBytes::serialize(params).unwrap(),
        ..Message::default()
    };

    let res_m6 = executor
        .execute_message(message_m6, ApplyKind::Explicit, 100)
        .unwrap();

    // assert_eq!(res_m3.msg_receipt.exit_code.value(), 0);

    result.push(res_m6);

    // Calling `Transfer`

    let params = TransferParams {
        receiver_addr: sender[1].1.to_string(),
        transfer_amount: 500,
    };

    let message_m7 = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 7,
        sequence: 3,
        params: RawBytes::serialize((params.receiver_addr, params.transfer_amount)).unwrap(),
        ..Message::default()
    };

    let res_m7 = executor
        .execute_message(message_m7, ApplyKind::Explicit, 100)
        .unwrap();

    // assert_eq!(res_m7.msg_receipt.exit_code.value(), 0);

    result.push(res_m7);

    // Calling `Allowance`

    let params = AllowanceParams {
        wallet_addr: sender[1].1.to_string(),
        new_allowance: 500,
    };

    let message_m10 = Message {
        from: sender[0].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 10,
        sequence: 4,
        params: RawBytes::serialize((params.new_allowance, params.wallet_addr)).unwrap(),
        ..Message::default()
    };

    let res_m10 = executor
        .execute_message(message_m10, ApplyKind::Explicit, 100)
        .unwrap();

    // assert_eq!(res_m10.msg_receipt.exit_code.value(), 0);

    result.push(res_m10);

    // Calling `TransferFrom`

    let params = TransferFromParams {
        owner_addr: sender[0].1.to_string(),
        receiver_addr: sender[2].1.to_string(),
        transfer_amount: 500,
    };

    let message_m9 = Message {
        from: sender[1].1,
        to: actor_address,
        gas_limit: 1000000000,
        method_num: 9,
        sequence: 0,
        params: RawBytes::serialize((
            params.owner_addr,
            params.receiver_addr,
            params.transfer_amount,
        ))
        .unwrap(),
        ..Message::default()
    };

    let res_m9 = executor
        .execute_message(message_m9, ApplyKind::Explicit, 100)
        .unwrap();

    // assert_eq!(res_m9.msg_receipt.exit_code.value(), 0);

    result.push(res_m9);

    return result;
}

fn main() {
    println!("Running benchmark");

    let res_as_incremental = run_fvm(AS_INCREMENTAL_WASM_COMPILED_PATH);
    let as_incremental_size = fs::metadata(AS_INCREMENTAL_WASM_COMPILED_PATH)
        .unwrap()
        .len() as i64;

    let res_as_minimal = run_fvm(AS_MINIMAL_WASM_COMPILED_PATH);
    let as_minimal_size = fs::metadata(AS_MINIMAL_WASM_COMPILED_PATH).unwrap().len() as i64;

    let res_as_stub = run_fvm(AS_STUB_WASM_COMPILED_PATH);
    let as_stub_size = fs::metadata(AS_STUB_WASM_COMPILED_PATH).unwrap().len() as i64;

    let res_go = run_fvm(GO_WASM_COMPILED_PATH);
    let go_size = fs::metadata(GO_WASM_COMPILED_PATH).unwrap().len() as i64;

    let gas_used_array_m2 = vec![
        res_as_incremental[0].msg_receipt.gas_used,
        res_as_minimal[0].msg_receipt.gas_used,
        res_as_stub[0].msg_receipt.gas_used,
        res_go[0].msg_receipt.gas_used,
    ];
    let min_gas_used_m2 = gas_used_array_m2.iter().min().unwrap();

    let gas_used_array_m3 = vec![
        res_as_incremental[1].msg_receipt.gas_used,
        res_as_minimal[1].msg_receipt.gas_used,
        res_as_stub[1].msg_receipt.gas_used,
        res_go[1].msg_receipt.gas_used,
    ];
    let min_gas_used_m3 = gas_used_array_m3.iter().min().unwrap();

    let gas_used_array_m6 = vec![
        res_as_incremental[2].msg_receipt.gas_used,
        res_as_minimal[2].msg_receipt.gas_used,
        res_as_stub[2].msg_receipt.gas_used,
        res_go[2].msg_receipt.gas_used,
    ];
    let min_gas_used_m6 = gas_used_array_m6.iter().min().unwrap();

    let gas_used_array_m7 = vec![
        res_as_incremental[3].msg_receipt.gas_used,
        res_as_minimal[3].msg_receipt.gas_used,
        res_as_stub[3].msg_receipt.gas_used,
        res_go[3].msg_receipt.gas_used,
    ];
    let min_gas_used_m7 = gas_used_array_m7.iter().min().unwrap();

    let gas_used_array_m10 = vec![
        res_as_incremental[4].msg_receipt.gas_used,
        res_as_minimal[4].msg_receipt.gas_used,
        res_as_stub[4].msg_receipt.gas_used,
        res_go[4].msg_receipt.gas_used,
    ];
    let min_gas_used_m10 = gas_used_array_m10.iter().min().unwrap();

    let gas_used_array_m9 = vec![
        res_as_incremental[5].msg_receipt.gas_used,
        res_as_minimal[5].msg_receipt.gas_used,
        res_as_stub[5].msg_receipt.gas_used,
        res_go[5].msg_receipt.gas_used,
    ];
    let min_gas_used_m9 = gas_used_array_m9.iter().min().unwrap();

    let file_size_array = vec![as_incremental_size, as_minimal_size, as_stub_size, go_size];
    let min_file_size = file_size_array.iter().min().unwrap();

    let mut table = Table::new();
    table.add_row(row![
        "ACTOR FILE",
        "GetName (gas)",
        "GetSymbol (gas)",
        "GetBalanceOf (gas)",
        "Transfer (gas)",
        "Allowance (gas)",
        "TransferFrom (gas)",
        "FILE SIZE"
    ]);
    table.add_row(row![
        "Assemblyscript (incremental)",
        format!(
            "{} (+{}%)",
            res_as_incremental[0].msg_receipt.gas_used,
            percentage(res_as_incremental[0].msg_receipt.gas_used, *min_gas_used_m2)
        ),
        format!(
            "{} (+{}%)",
            res_as_incremental[1].msg_receipt.gas_used,
            percentage(res_as_incremental[1].msg_receipt.gas_used, *min_gas_used_m3)
        ),
        format!(
            "{} (+{}%)",
            res_as_incremental[2].msg_receipt.gas_used,
            percentage(res_as_incremental[2].msg_receipt.gas_used, *min_gas_used_m6)
        ),
        format!(
            "{} (+{}%)",
            res_as_incremental[3].msg_receipt.gas_used,
            percentage(res_as_incremental[3].msg_receipt.gas_used, *min_gas_used_m7)
        ),
        format!(
            "{} (+{}%)",
            res_as_incremental[4].msg_receipt.gas_used,
            percentage(
                res_as_incremental[4].msg_receipt.gas_used,
                *min_gas_used_m10
            )
        ),
        format!(
            "{} (+{}%)",
            res_as_incremental[5].msg_receipt.gas_used,
            percentage(res_as_incremental[5].msg_receipt.gas_used, *min_gas_used_m9)
        ),
        format!(
            "{} (+{}%)",
            as_incremental_size,
            percentage(as_incremental_size, *min_file_size)
        )
    ]);
    table.add_row(row![
        "Assemblyscript (minimal)",
        format!(
            "{} (+{}%)",
            res_as_minimal[0].msg_receipt.gas_used,
            percentage(res_as_minimal[0].msg_receipt.gas_used, *min_gas_used_m2)
        ),
        format!(
            "{} (+{}%)",
            res_as_minimal[1].msg_receipt.gas_used,
            percentage(res_as_minimal[1].msg_receipt.gas_used, *min_gas_used_m3)
        ),
        format!(
            "{} (+{}%)",
            res_as_minimal[2].msg_receipt.gas_used,
            percentage(res_as_minimal[2].msg_receipt.gas_used, *min_gas_used_m6)
        ),
        format!(
            "{} (+{}%)",
            res_as_minimal[3].msg_receipt.gas_used,
            percentage(res_as_minimal[3].msg_receipt.gas_used, *min_gas_used_m7)
        ),
        format!(
            "{} (+{}%)",
            res_as_minimal[4].msg_receipt.gas_used,
            percentage(res_as_minimal[4].msg_receipt.gas_used, *min_gas_used_m10)
        ),
        format!(
            "{} (+{}%)",
            res_as_minimal[5].msg_receipt.gas_used,
            percentage(res_as_minimal[5].msg_receipt.gas_used, *min_gas_used_m9)
        ),
        format!(
            "{} (+{}%)",
            as_minimal_size,
            percentage(as_minimal_size, *min_file_size)
        )
    ]);
    table.add_row(row![
        "Assemblyscript (stub)",
        format!(
            "{} (+{}%)",
            res_as_stub[0].msg_receipt.gas_used,
            percentage(res_as_stub[0].msg_receipt.gas_used, *min_gas_used_m2)
        ),
        format!(
            "{} (+{}%)",
            res_as_stub[1].msg_receipt.gas_used,
            percentage(res_as_stub[1].msg_receipt.gas_used, *min_gas_used_m3)
        ),
        format!(
            "{} (+{}%)",
            res_as_stub[2].msg_receipt.gas_used,
            percentage(res_as_stub[2].msg_receipt.gas_used, *min_gas_used_m6)
        ),
        format!(
            "{} (+{}%)",
            res_as_stub[3].msg_receipt.gas_used,
            percentage(res_as_stub[3].msg_receipt.gas_used, *min_gas_used_m7)
        ),
        format!(
            "{} (+{}%)",
            res_as_stub[4].msg_receipt.gas_used,
            percentage(res_as_stub[4].msg_receipt.gas_used, *min_gas_used_m10)
        ),
        format!(
            "{} (+{}%)",
            res_as_stub[5].msg_receipt.gas_used,
            percentage(res_as_stub[5].msg_receipt.gas_used, *min_gas_used_m9)
        ),
        format!(
            "{} (+{}%)",
            as_stub_size,
            percentage(as_stub_size, *min_file_size)
        )
    ]);
    table.add_row(row![
        "Go actor",
        format!(
            "{} (+{}%)",
            res_go[0].msg_receipt.gas_used,
            percentage(res_go[0].msg_receipt.gas_used, *min_gas_used_m2)
        ),
        format!(
            "{} (+{}%)",
            res_go[1].msg_receipt.gas_used,
            percentage(res_go[1].msg_receipt.gas_used, *min_gas_used_m3)
        ),
        format!(
            "{} (+{}%)",
            res_go[2].msg_receipt.gas_used,
            percentage(res_go[2].msg_receipt.gas_used, *min_gas_used_m6)
        ),
        format!(
            "{} (+{}%)",
            res_go[3].msg_receipt.gas_used,
            percentage(res_go[3].msg_receipt.gas_used, *min_gas_used_m7)
        ),
        format!(
            "{} (+{}%)",
            res_go[4].msg_receipt.gas_used,
            percentage(res_go[4].msg_receipt.gas_used, *min_gas_used_m10)
        ),
        format!(
            "{} (+{}%)",
            res_go[5].msg_receipt.gas_used,
            percentage(res_go[5].msg_receipt.gas_used, *min_gas_used_m9)
        ),
        format!("{} (+{}%)", go_size, percentage(go_size, *min_file_size))
    ]);

    let path = std::path::Path::new("benchmark_results.csv");
    let display = path.display();

    let out = match fs::File::create(&path) {
        Err(why) => panic!("couldn't create {}: {}", display, why),
        Ok(file) => file,
    };

    table.to_csv(out).expect("table cannot be written to csv");

    table.printstd();
}
