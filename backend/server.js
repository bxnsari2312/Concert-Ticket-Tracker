const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { scrapeTicketmasterLowestPrice } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

// --- Initialize DB (no num_tickets) ---
const db = new sqlite3.Database('db.sqlite');
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concert_name TEXT,
      ticket_url TEXT,
      email TEXT,
      target_price REAL,
      last_price REAL,
      lowest_price REAL
    )
  `);
});

// --- API: Add concert ---
app.post('/api/add', (req, res) => {
    const { concert_name, ticket_url, email, target_price } = req.body;
    db.run(
        `INSERT INTO watchlist (concert_name, ticket_url, email, target_price, last_price, lowest_price)
         VALUES (?, ?, ?, ?, NULL, NULL)`,
        [concert_name, ticket_url, email, target_price],
        function (err) {
            if (err) {
                console.error('[DB Error] Failed to add concert:', err);
                return res.status(500).send('DB error');
            }
            // Log the added item
            console.log(`[ADD] Concert added:`, {
                id: this.lastID,
                concert_name, ticket_url, email, target_price
            });
            res.send({ ok: true, id: this.lastID });
        }
    );
});

// --- API: Get watchlist ---
app.get('/api/watchlist', (req, res) => {
    db.all(`SELECT * FROM watchlist`, (err, rows) => {
        if (err) return res.status(500).send('DB error');
        res.send(rows);
    });
});

// --- API: Delete concert from watchlist ---
app.delete('/api/delete/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM watchlist WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error("[DB error on fetch for delete]:", err);
            return res.status(500).send('DB error');
        }
        if (row) {
            console.log(`[DELETE] Concert removed:`, row);
        } else {
            console.log(`[DELETE] Concert with id=${id} not found.`);
        }
        db.run(`DELETE FROM watchlist WHERE id = ?`, [id], function (delErr) {
            if (delErr) return res.status(500).send('DB error');
            res.send({ ok: true, deleted: this.changes });
        });
    });
});

// --- Email notification function using Gmail ---
function sendEmail(to, concert, price, url) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'bansari232004@gmail.com', // <-- replace with your Gmail address
            pass: 'ipqahtzjphmsmezr'     // <-- replace with your 16-char app password
        }
    });

    transporter.sendMail({
        from: '"Ticket Tracker" <bansari232004@gmail.com>',
        to,
        subject: `Price Drop for ${concert}!`,
        text: `Good news! Ticket price is now $${price}.\n\nCheck it here: ${url}`,
    }, (err, info) => {
        if (err) console.error('Email error:', err);
        else console.log('Notification email sent:', info.response);
    });
}

// --- Scheduled price checking ---
setInterval(async () => {
    db.all(`SELECT * FROM watchlist`, async (err, rows) => {
        if (err) return console.error('DB error:', err);
        for (let row of rows) {
            try {
                // No numTickets param now, so just call with default
                const { price, link } = await scrapeTicketmasterLowestPrice(row.ticket_url);
                console.log(`[${row.concert_name}] Scraped price:`, price, link || row.ticket_url);

                if (price == null) continue; // couldn't scrape

                // If new lowest, notify and update both last_price and lowest_price
                if (row.lowest_price == null || price < row.lowest_price) {
                    if (row.target_price && price <= row.target_price) {
                        sendEmail(row.email, row.concert_name, price, link || row.ticket_url);
                    }
                    db.run(
                        `UPDATE watchlist SET last_price = ?, lowest_price = ? WHERE id = ?`,
                        [price, price, row.id]
                    );
                } else if (price !== row.last_price) {
                    // Just update last_price if price changed but not a new lowest
                    db.run(`UPDATE watchlist SET last_price = ? WHERE id = ?`, [price, row.id]);
                }
            } catch (e) {
                console.error('Scraper error:', e);
            }
        }
    });
}, 1000 * 60 * 1); // every 1 minute (testing)

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Backend running on', PORT));
