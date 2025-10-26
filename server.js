import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

// API POST route
app.post("/api/scan", async (req, res) => {
  const { address, chain } = req.body;

  if (!address || !chain) {
    return res.status(400).json({ error: "Address and chain are required" });
  }

  // Basic chain-specific validation
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(address);
  const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);

  if (chain === "ethereum" && !isEvm) {
    return res.status(400).json({ error: "Invalid EVM address format" });
  }
  if (chain === "solana" && !isSolana) {
    return res.status(400).json({ error: "Invalid Solana address format" });
  }

  try {
    // ✅ Call live data API based on chain
    let details, score, labels;

    if (chain === "ethereum") {
      // Example: Etherscan or Covalent API
      const resp = await fetch(
        `https://api.covalenthq.com/v1/eth-mainnet/address/${address}/balances_v2/?key=${process.env.COVALENT_API_KEY}`
      );
      const data = await resp.json();
      details = data.data || {};
      score = Math.min(100, (details.items?.length || 0) * 5);
      labels = ["EVM"];
    } else {
      // Example: SolanaFM or Helius
      const resp = await fetch(`https://api.helius.xyz/v0/addresses/${address}?api-key=${process.env.HELIUS_API_KEY}`);
      const data = await resp.json();
      details = data || {};
      score = Math.min(100, (details.balance || 0) / 1000000);
      labels = ["Solana"];
    }

    res.json({ score, labels, details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch live data" });
  }
});

    let result;

    if (chain === "ethereum") {
      const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.ETHERSCAN_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      // Example scoring logic
      const score = data.result ? Math.min(100, data.result.length) : 0;
      const labels = score > 50 ? ["Active"] : ["Inactive"];
      result = { score, labels, details: data.result || [] };

    } else if (chain === "solana") {
      const url = `https://pro-api.solscan.io/v2.0/account/transactions?address=${address}&limit=50`;
      const r = await fetch(url, {
        headers: { "token": process.env.SOLSCAN_KEY }
      });
      const data = await r.json();
      const score = data.data ? Math.min(100, data.data.length) : 0;
      const labels = score > 50 ? ["Active"] : ["Inactive"];
      result = { score, labels, details: data.data || [] };

    } else {
      return res.status(400).json({ error: "Unsupported chain" });
    }

    res.json(result);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

console.log("Covalent API Key:", process.env.COVALENT_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("Helius API Key:", process.env.HELIUS_API_KEY ? "Loaded ✅" : "Missing ❌");

app.listen(PORT, () => console.log(`Wallet Score server running on port ${PORT}`));
