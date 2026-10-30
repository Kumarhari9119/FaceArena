
import { database, authReady } from "./firebase.js";

import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const voteElement = document.getElementById("liveTotalVotes");
const photoElement = document.getElementById("liveTotalPhotos");
const participantElement = document.getElementById("liveParticipants");
const countryElement = document.getElementById("liveCountries");

const stats = {
  uploads: {},
  ratings: {}
};

function animateNumber(element, value) {
  if (!element) return;

  const target = Number(value) || 0;
  const current = Number(element.dataset.current || 0);

  if (current === target) return;

  element.dataset.current = String(target);

  const duration = 700;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    const displayed = Math.round(
      current + (target - current) * eased
    );

    element.textContent = displayed.toLocaleString("en-IN");

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function updateStatistics() {
  const uploads = Object.entries(stats.uploads)
    .map(([id, item]) => ({ id, ...item }))
    .filter(item =>
      item &&
      item.status === "approved" &&
      typeof item.imageUrl === "string" &&
      item.imageUrl.startsWith("https://res.cloudinary.com/")
    );

  const uploadIds = new Set(uploads.map(item => item.id));

  let totalVotes = 0;

  Object.entries(stats.ratings).forEach(([uploadId, ratings]) => {
    if (!uploadIds.has(uploadId) || !ratings) return;

    Object.values(ratings).forEach(value => {
      if (
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 5
      ) {
        totalVotes++;
      }
    });
  });

  const participants = new Set();
  const countries = new Set();

  uploads.forEach(item => {
    if (item.userId) {
      participants.add(item.userId);
    }

    if (typeof item.country === "string" && item.country.trim()) {
      countries.add(item.country.trim().toLowerCase());
    }
  });

  animateNumber(voteElement, totalVotes);
  animateNumber(photoElement, uploads.length);
  animateNumber(participantElement, participants.size);
  animateNumber(countryElement, countries.size);
}

async function startLiveStatistics() {
  try {
    await authReady;

    const approvedUploadsQuery = query(
      ref(database, "uploads"),
      orderByChild("status"),
      equalTo("approved")
    );

    onValue(
      approvedUploadsQuery,
      snapshot => {
        stats.uploads = snapshot.val() || {};
        updateStatistics();
      },
      error => {
        console.error("FaceArena uploads statistics error:", error);
      }
    );

    onValue(
      ref(database, "ratings"),
      snapshot => {
        stats.ratings = snapshot.val() || {};
        updateStatistics();
      },
      error => {
        console.error("FaceArena ratings statistics error:", error);
      }
    );

  } catch (error) {
    console.error("FaceArena live statistics failed:", error);

    [voteElement, photoElement, participantElement, countryElement]
      .forEach(element => {
        if (element) element.textContent = "—";
      });
  }
}

// Correct navigation for homepage buttons.
function connectButton(id, destination) {
  const button = document.getElementById(id);

  if (!button) return;

  button.addEventListener("click", () => {
    window.location.href = destination;
  });
}

connectButton("startVotingBtn", "arena.html");
connectButton("startArenaBtn", "arena.html");
connectButton("exploreArenaBtn", "arena.html");

connectButton("heroUploadBtn", "upload.html");
connectButton("uploadNowBtn", "upload.html");

// Header upload button.
document.querySelectorAll(".upload-btn").forEach(button => {
  button.addEventListener("click", () => {
    window.location.href = "upload.html";
  });
});

startLiveStatistics();
