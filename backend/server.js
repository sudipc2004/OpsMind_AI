const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// AI route
app.post("/analyze", (req, res) => {
  const log = req.body.log;

  // Correct path to predict.py
  const scriptPath = path.join(__dirname, "../ml_model/predict.py");

  exec(
    `py "${scriptPath}" "${log}"`,
    { cwd: path.join(__dirname, "../ml_model") }, // VERY IMPORTANT
    (error, stdout, stderr) => {
      console.log("STDOUT:", stdout);
      console.log("STDERR:", stderr);

      if (error) {
        console.error("ERROR:", error);
        return res.json({ result: "Error in AI" });
      }

      res.json({ result: stdout.trim() });
    }
  );
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});