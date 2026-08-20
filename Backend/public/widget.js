(function () {
  if (window.FeedbackHubWidgetLoaded) return;
  window.FeedbackHubWidgetLoaded = true;

  const script = document.currentScript;
  const apiKey = script ? script.getAttribute("data-api-key") : null;
  const apiHost = script ? script.getAttribute("data-api-host") || "http://localhost:4000" : "http://localhost:4000";

  if (!apiKey) {
    console.error("[FeedbackHub Widget] Missing data-api-key attribute on script tag.");
    return;
  }

  // Inject styles
  const style = document.createElement("style");
  style.innerHTML = `
    .fh-widget-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #e11d48;
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4);
      display: flex;
      items-center: center;
      gap: 8px;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .fh-widget-btn:hover {
      background: #be123c;
      transform: translateY(-2px);
    }
    .fh-widget-modal {
      display: none;
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 999999;
      width: 360px;
      max-width: calc(100vw - 40px);
      background: #18181b;
      color: #f4f4f5;
      border: 1px solid #27272a;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .fh-widget-header {
      padding: 16px;
      background: #27272a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .fh-widget-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    .fh-widget-close {
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 18px;
      cursor: pointer;
    }
    .fh-widget-body {
      padding: 16px;
    }
    .fh-widget-field {
      margin-bottom: 12px;
    }
    .fh-widget-field label {
      display: block;
      font-size: 12px;
      color: #a1a1aa;
      margin-bottom: 4px;
    }
    .fh-widget-field input, .fh-widget-field select, .fh-widget-field textarea {
      width: 100%;
      padding: 8px 12px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #ffffff;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
    }
    .fh-widget-field textarea {
      resize: vertical;
      min-height: 70px;
    }
    .fh-widget-submit {
      width: 100%;
      padding: 10px;
      background: #e11d48;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .fh-widget-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .fh-widget-status {
      margin-top: 10px;
      font-size: 12px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);

  // Floating Button
  const btn = document.createElement("button");
  btn.className = "fh-widget-btn";
  btn.innerHTML = `💬 Feedback`;
  document.body.appendChild(btn);

  // Modal
  const modal = document.createElement("div");
  modal.className = "fh-widget-modal";
  modal.innerHTML = `
    <div class="fh-widget-header">
      <h3>Send Feedback</h3>
      <button class="fh-widget-close">&times;</button>
    </div>
    <div class="fh-widget-body">
      <form id="fh-widget-form">
        <div class="fh-widget-field">
          <label>Subject / Title</label>
          <input type="text" id="fh-title" placeholder="Brief summary" required />
        </div>
        <div class="fh-widget-field">
          <label>Your Name</label>
          <input type="text" id="fh-name" placeholder="John Doe" required />
        </div>
        <div class="fh-widget-field">
          <label>Email Address</label>
          <input type="email" id="fh-email" placeholder="john@example.com" required />
        </div>
        <div class="fh-widget-field">
          <label>Category</label>
          <select id="fh-category">
            <option value="Feature Request">Feature Request</option>
            <option value="Bug">Bug Report</option>
            <option value="Usability">Usability / UX</option>
            <option value="Performance">Performance</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="fh-widget-field">
          <label>Feedback Message</label>
          <textarea id="fh-content" placeholder="Describe your experience or feature idea..." required></textarea>
        </div>
        <button type="submit" class="fh-widget-submit">Submit Feedback</button>
        <div class="fh-widget-status" id="fh-status"></div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Event Listeners
  btn.addEventListener("click", () => {
    modal.style.display = modal.style.display === "block" ? "none" : "block";
  });

  modal.querySelector(".fh-widget-close").addEventListener("click", () => {
    modal.style.display = "none";
  });

  const form = modal.querySelector("#fh-widget-form");
  const status = modal.querySelector("#fh-status");
  const submitBtn = modal.querySelector(".fh-widget-submit");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";
    status.innerText = "";
    status.style.color = "#a1a1aa";

    const payload = {
      title: document.getElementById("fh-title").value,
      customerName: document.getElementById("fh-name").value,
      customerEmail: document.getElementById("fh-email").value,
      category: document.getElementById("fh-category").value,
      content: document.getElementById("fh-content").value,
    };

    fetch(apiHost + "/api/widget/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to submit feedback");
        return res.json();
      })
      .then((data) => {
        status.innerText = "Thank you! Your feedback has been received.";
        status.style.color = "#10b981";
        form.reset();
        setTimeout(() => {
          modal.style.display = "none";
          status.innerText = "";
          submitBtn.disabled = false;
          submitBtn.innerText = "Submit Feedback";
        }, 2500);
      })
      .catch((err) => {
        status.innerText = err.message || "An error occurred. Please try again.";
        status.style.color = "#ef4444";
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Feedback";
      });
  });
})();
