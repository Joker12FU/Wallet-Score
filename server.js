import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

// API POST route
app.post("/api/scan", async (req, res) => {
  try {
    const { address, chain } = req.body;

    if (!address || !chain) return res.status(400).json({ error: "Missing address or chain" });

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
app.listen(PORT, () => console.log(`Wallet Score server running on port ${PORT}`));
