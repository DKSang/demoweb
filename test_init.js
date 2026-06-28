

async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/lessons/RJbUtcaoNCY/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    console.log("Success! Vocabulary length:", data.vocab?.length);
    console.log("Lines length:", data.lines?.length);
    console.log("First 5 lines:", JSON.stringify(data.lines?.slice(0, 5), null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
