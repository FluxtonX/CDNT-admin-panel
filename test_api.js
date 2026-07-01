async function run() {
  try {
    const res = await fetch("http://localhost:3001/api/users/1e430be7-6b4b-451e-be52-b002227a17c4");
    if (!res.ok) {
       console.log("Response not OK:", res.status, res.statusText);
       return;
    }
    const data = await res.json();
    console.log("Threads from API:", data.threads);
  } catch (err) {
    console.error(err);
  }
}
run();
