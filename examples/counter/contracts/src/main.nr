use aztec::macros::aztec;

/// Minimal public counter used by the testnet paymaster example.
#[aztec]
contract Counter {
    use aztec::{
        macros::{functions::{external, initializer}, storage::storage},
        state_vars::PublicMutable,
    };

    #[storage]
    struct Storage<Context> {
        count: PublicMutable<u64, Context>,
    }

    #[initializer]
    #[external("public")]
    fn constructor(initial: u64) {
        self.storage.count.write(initial);
    }

    #[external("public")]
    fn increment() {
        let current = self.storage.count.read();
        self.storage.count.write(current + 1);
    }

    #[external("public")]
    fn add(amount: u64) {
        let current = self.storage.count.read();
        self.storage.count.write(current + amount);
    }

    #[external("utility")]
    unconstrained fn get_count() -> u64 {
        self.storage.count.read()
    }
}
