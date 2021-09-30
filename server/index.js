require("dotenv").config();

const web3 = require("@solana/web3.js");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT;

const SolanaClusters = ["devnet", "testnet", "mainnet-beta"];

//Initializing Solana network connection
const connection = SolanaClusters.includes(process.env.SOLANA_NETWORK)
  ? new web3.Connection(
      web3.clusterApiUrl(process.env.SOLANA_NETWORK),
      "confirmed"
    )
  : new web3.Connection(process.env.SOLANA_NETWORK, "confirmed");

//Retrieve payer account keys
const payerAccount = web3.Keypair.fromSecretKey(
  Buffer.from(process.env.PAYER_PRIVATE_KEY, "base64")
);

console.log(`Payer: ${payerAccount.publicKey.toBase58()}`);

app.use(
  cors({
    origin: "*",
  })
);

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
// parse application/json
app.use(express.json());

app.post("/", async (req, res) => {
  //Retrieve public key from address
  const { address } = req.body;
  const to = new web3.PublicKey(address);

  const balance = await connection.getBalance(to);

  if (balance < web3.LAMPORTS_PER_SOL * process.env.BALANCE_LIMIT) {
    try {
      // Add transfer instruction to transaction
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: payerAccount.publicKey,
          toPubkey: to,
          lamports: web3.LAMPORTS_PER_SOL * process.env.SOL_AMOUNT,
        })
      );

      // Sign transaction, broadcast, and confirm
      const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payerAccount]
      );

      //response for web3 transaction success
      res.json({
        status: "success",
        transactionSignature: signature,
      });
    } catch (error) {
      //response for web3 transaction error
      res.json({
        status: "failed",
        errorCode: 2,
        errorMessage: error,
      });
    }
  } else {
    //Response for balance limit excedeed
    res.json({
      status: "failed",
      errorCode: 1,
      errorMessage: "The account balance limit has already been exceeded",
    });
  }
});

app.listen(port, () =>
  console.log(`Solana faucet app listening on port ${port}!`)
);
