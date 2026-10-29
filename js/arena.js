
import { app } from "./firebase.js";

import {
  getDatabase,
  ref,
  query,
  orderByChild,
  equalTo,
  get
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const database = getDatabase(app);

const gallery = document.getElementById("arenaGallery");
const message = document.getElementById("arenaMessage");
const countLabel = document.getElementById("arenaCount");
const refreshButton = document.getElementById("arenaRefresh");

function showMessage(text) {
  message.hidden = false;
  message.textContent = text;
}

async function loadGallery() {
  gallery.replaceChildren();
  countLabel.textContent = "Loading...";
  showMessage("Loading approved photos...");

  refreshButton.disabled = true;

  try {
    const approvedQuery = query(
      ref(database, "uploads"),
      orderByChild("status"),
      equalTo("approved")
    );

    const snapshot = await get(approvedQuery);
    const data = snapshot.val() || {};

    const uploads = Object.entries(data)
      .map(([id, item]) => ({ id, ...item }))
      .filter(item =>
        item &&
        item.status === "approved" &&
        typeof item.imageUrl === "string" &&
        item.imageUrl.startsWith(
          "https://res.cloudinary.com/"
        )
      )
      .sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
      );

    countLabel.textContent =
      `${uploads.length} approved photo${uploads.length === 1 ? "" : "s"}`;

    if (uploads.length === 0) {
      showMessage(
        "No approved photos yet. Submissions will appear here after review."
      );
      return;
    }

    message.hidden = true;

    uploads.forEach(item => {
      const card = document.createElement("article");
      card.className = "arena-card";

      const image = document.createElement("img");
      image.className = "arena-card-image";
      image.src = item.imageUrl;
      image.alt = `Photo by ${item.nickname || "contestant"}`;
      image.loading = "lazy";

      const body = document.createElement("div");
      body.className = "arena-card-body";

      const title = document.createElement("h2");
      title.className = "arena-card-title";
      title.textContent =
        item.nickname || "Anonymous contestant";

      const country = document.createElement("p");
      country.className = "arena-card-country";
      country.textContent =
        item.country || "Country not provided";

      const meta = document.createElement("div");
      meta.className = "arena-card-meta";

      const badge = document.createElement("span");
      badge.className = "arena-status";
      badge.textContent = "✓ Approved";

      const age = document.createElement("span");
      age.className = "arena-card-country";
      age.textContent = item.age ? `Age ${item.age}` : "";

      meta.append(badge, age);
      body.append(title, country, meta);
      card.append(image, body);
      gallery.append(card);
    });

  } catch (error) {
    console.error("FaceArena gallery error:", error);

    countLabel.textContent = "Gallery unavailable";

    showMessage(
      "Photos could not load. Please check Firebase Rules and refresh."
    );
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadGallery);

loadGallery();
