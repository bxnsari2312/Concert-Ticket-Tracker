import { useState, useEffect } from "react";
import axios from "axios";

const backendURL = "http://localhost:3001"; // change if deploying elsewhere

function App() {
  const [concerts, setConcerts] = useState([]);
  const [form, setForm] = useState({
    concert_name: "",
    ticket_url: "",
    email: "",
    target_price: "",
  });

  useEffect(() => {
    fetchConcerts();
    // Optionally poll every 60s:
    // const interval = setInterval(fetchConcerts, 60000);
    // return () => clearInterval(interval);
  }, []);

  async function fetchConcerts() {
    try {
      let res = await axios.get(`${backendURL}/api/watchlist`);
      setConcerts(res.data);
    } catch {
      alert("Failed to fetch watchlist.");
    }
  }

  async function addConcert(e) {
    e.preventDefault();
    try {
      await axios.post(`${backendURL}/api/add`, form);
      setForm({
        concert_name: "",
        ticket_url: "",
        email: "",
        target_price: "",
      });
      fetchConcerts();
    } catch {
      alert("Failed to add concert.");
    }
  }

  async function deleteConcert(id) {
    if (!window.confirm("Delete this watchlist item?")) return;
    try {
      await axios.delete(`${backendURL}/api/delete/${id}`);
      fetchConcerts();
    } catch {
      alert("Failed to delete concert.");
    }
  }

  return (
    <div className="min-h-screen bg-[#18191A] text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 mt-4 text-center drop-shadow">Concert Ticket Price Tracker</h1>

        {/* --- Add Form --- */}
        <form
          onSubmit={addConcert}
          className="flex flex-col gap-3 mb-10 bg-[#23272F] p-6 rounded-2xl shadow-xl"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={form.concert_name}
              onChange={e => setForm({ ...form, concert_name: e.target.value })}
              placeholder="Concert Name"
              className="flex-1 rounded px-3 py-2 bg-[#18191A] text-white border border-gray-700 focus:outline-none"
              required
            />
            <input
              value={form.ticket_url}
              onChange={e => setForm({ ...form, ticket_url: e.target.value })}
              placeholder="Ticketmaster Event URL"
              className="flex-1 rounded px-3 py-2 bg-[#18191A] text-white border border-gray-700 focus:outline-none"
              required
            />
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Your Email"
              type="email"
              className="flex-1 rounded px-3 py-2 bg-[#18191A] text-white border border-gray-700 focus:outline-none"
              required
            />
            <input
              value={form.target_price}
              onChange={e => setForm({ ...form, target_price: e.target.value })}
              placeholder="Notify me if below this price ($)"
              type="number"
              min={1}
              className="flex-1 rounded px-3 py-2 bg-[#18191A] text-white border border-gray-700 focus:outline-none"
              required
            />
          </div>
          <button
            className="mt-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold rounded-xl px-5 py-2 transition-all shadow"
            type="submit"
          >
            Add to Watchlist
          </button>
        </form>

        {/* --- Watchlist --- */}
        <h2 className="text-2xl font-bold mb-4 mt-6">Your Watchlist</h2>
        <ul className="space-y-4">
          {concerts.length === 0 && (
            <li className="text-gray-400">No concerts being tracked.</li>
          )}
          {concerts.map(c => (
            <li key={c.id} className="bg-[#22242A] rounded-xl px-4 py-4 flex flex-col md:flex-row md:items-center gap-2 shadow">
              <div className="flex-1 min-w-0">
                <a
                  href={c.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-blue-300 hover:underline break-all"
                >
                  {c.concert_name}
                </a>
                <div className="text-gray-300 mt-1 text-sm">
                  {c.last_price && <span>Last Seen: <b>${c.last_price}</b> </span>}
                  {c.lowest_price && <span>| Lowest: <b>${c.lowest_price}</b> </span>}
                  {c.target_price && <span>| Target: <b>${c.target_price}</b> </span>}
                </div>
                {c.lowest_url && (
                  <div className="mt-1">
                    <a
                      href={c.lowest_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:underline text-sm"
                    >
                      View Lowest Ticket
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteConcert(c.id)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-white shadow"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
