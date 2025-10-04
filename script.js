console.log("Lets write JavaScript");
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
  currFolder = folder;
  // Use a relative path so the fetch is resolved relative to the page
  // (avoids requesting from the server root which caused the 404)
  let a = await fetch(`${folder}/`);
  console.log("A", a);
  console.log("Fetching songs from", folder);
  let response = await a.text();
  console.log("Response", response);
  let div = document.createElement("div");
  div.innerHTML = response;
  let as = div.getElementsByTagName("a");
  songs = [];
  for (let index = 0; index < as.length; index++) {
    const element = as[index];
    console.log("element", element);
    // Some servers (or the live preview) return directory links using
    // backslashes or percent-encoded backslashes (%5C). To handle those
    // reliably, read the raw href attribute, decode it, normalize
    // backslashes to forward slashes, then pick the basename.
    let rawHref = element.getAttribute("href") || element.href;
    if (!rawHref) continue;
    try {
      rawHref = decodeURIComponent(rawHref);
    } catch (e) {
      // ignore decode errors and use raw value
    }
    const normalized = rawHref.replace(/\\/g, "/").replace(/\\/g, "/").replace(/\\\\/g, "/").replace(/\\/g, "/").replace(/\"/g, '"');
    // also replace any remaining backslashes
    const finalPath = normalized.replace(/\\/g, "/");
    // skip directories and parent links
    if (finalPath === "../" || finalPath === "./" || finalPath.endsWith("/")) continue;
    if (finalPath.toLowerCase().endsWith(".mp3")) {
      const filename = finalPath.split("/").pop();
      songs.push(filename);
      console.log("Found song", filename);
    }
  }

  // Show all the songs in the playlist
  let songUL = document
    .querySelector(".songList")
    .getElementsByTagName("ul")[0];
  songUL.innerHTML = "";
  for (const song of songs) {
    console.log("Song", song);
    songUL.innerHTML =
      songUL.innerHTML +
      `<li><img class="invert" width="34" src="img/music.svg" alt="">
                            <div class="info">
                                <div> ${song.replaceAll("%20", " ")}</div>
                            </div>
                            <div class="playnow">
                                <span>Play Now</span>
                                <img class="invert" src="img/play.svg" alt="">
                            </div> </li>`;
  }

  // Attach an event listener to each song
  Array.from(
    document.querySelector(".songList").getElementsByTagName("li")
  ).forEach((e) => {
    e.addEventListener("click", (element) => {
      playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
    });
  });

  return songs;
}

const playMusic = (track, pause = false) => {
  // Use relative media src so audio file is resolved relative to the page
  currentSong.src = `${currFolder}/` + track;
  if (!pause) {
    currentSong.play();
    play.src = "img/pause.svg";
  }
  document.querySelector(".songinfo").innerHTML = decodeURI(track);
  document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

async function displayAlbums() {
  console.log("displaying albums");
  // Fetch the songs folder relative to the page (no leading slash)
  let a = await fetch(`songs/`);
  let response = await a.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let anchors = div.getElementsByTagName("a");
  let cardContainer = document.querySelector(".cardContainer");
  let array = Array.from(anchors);
  for (let index = 0; index < array.length; index++) {
    const e = array[index];
    // Read raw href and normalize it so listings with backslashes or
    // percent-encoded backslashes are handled correctly.
    let rawHref = e.getAttribute("href") || e.href;
    if (!rawHref) continue;
    try {
      rawHref = decodeURIComponent(rawHref);
    } catch (err) {
      // ignore
    }
    let normalized = rawHref.replace(/\\/g, "/");
    // If it's an absolute URL, use the pathname part only
    try {
      const u = new URL(normalized, window.location.href);
      normalized = u.pathname;
    } catch (err) {
      // ignore and use normalized as-is
    }
    // Skip parent links and files (we only want folders inside songs)
    if (
      normalized === "../" ||
      normalized === "./" ||
      normalized.endsWith(".jpg") ||
      normalized.endsWith(".mp3") ||
      normalized.toLowerCase().endsWith("info.json")
    )
      continue;

    const parts = normalized.split("/").filter(Boolean);
    const songsIndex = parts.lastIndexOf("songs");
    if (songsIndex === -1) continue;
    const folder = parts[songsIndex + 1];
    if (!folder) continue;
    if (folder.includes(".htaccess")) continue;

    console.log("Folder", folder);
    // Get the metadata of the folder (relative)
    let metaResp;
    try {
      metaResp = await fetch(`songs/${folder}/info.json`);
      if (!metaResp.ok) {
        console.warn(`info.json not found for folder ${folder}:`, metaResp.status);
        continue;
      }
    } catch (err) {
      console.warn(`Failed fetching info.json for ${folder}:`, err);
      continue;
    }
    let response = await metaResp.json();
    console.log("Folder", folder, response);
    cardContainer.innerHTML =
      cardContainer.innerHTML +
      ` <div data-folder="${folder}" class="card">
            <div class="play">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                        stroke-linejoin="round" />
                </svg>
            </div>

      <img src="songs/${folder}/cover.jpg" alt="">
            <h2>${response.title}</h2>
            <p>${response.description}</p>
    </div>`;
  }

  // Load the playlist whenever card is clicked
  Array.from(document.getElementsByClassName("card")).forEach((e) => {
    e.addEventListener("click", async (item) => {
      console.log("Fetching Songs");
      songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
      playMusic(songs[0]);
    });
  });
}

async function main() {
  // Get the list of all the songs
  await getSongs("songs/ncs");
  playMusic(songs[0], true);

  // Display all the albums on the page
  await displayAlbums();

  // Attach an event listener to play, next and previous
  play.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play();
      play.src = "img/pause.svg";
    } else {
      currentSong.pause();
      play.src = "img/play.svg";
    }
  });

  // Listen for timeupdate event
  currentSong.addEventListener("timeupdate", () => {
    document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(
      currentSong.currentTime
    )} / ${secondsToMinutesSeconds(currentSong.duration)}`;
    document.querySelector(".circle").style.left =
      (currentSong.currentTime / currentSong.duration) * 100 + "%";
  });

  // Add an event listener to seekbar
  document.querySelector(".seekbar").addEventListener("click", (e) => {
    let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
    document.querySelector(".circle").style.left = percent + "%";
    currentSong.currentTime = (currentSong.duration * percent) / 100;
  });

  // Add an event listener for hamburger
  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  // Add an event listener for close button
  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-120%";
  });

  // Add an event listener to previous
  previous.addEventListener("click", () => {
    currentSong.pause();
    console.log("Previous clicked");
    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if (index - 1 >= 0) {
      playMusic(songs[index - 1]);
    }
  });

  // Add an event listener to next
  next.addEventListener("click", () => {
    currentSong.pause();
    console.log("Next clicked");

    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if (index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    }
  });

  // Add an event to volume
  document
    .querySelector(".range")
    .getElementsByTagName("input")[0]
    .addEventListener("change", (e) => {
      console.log("Setting volume to", e.target.value, "/ 100");
      currentSong.volume = parseInt(e.target.value) / 100;
      if (currentSong.volume > 0) {
        document.querySelector(".volume>img").src = document
          .querySelector(".volume>img")
          .src.replace("mute.svg", "volume.svg");
      }
    });

  //Add an event listener to mute
  let lastVolume = 0.5; // default
  document.querySelector(".volume>img").addEventListener("click", (e) => {
    if (currentSong.volume > 0) {
      lastVolume = currentSong.volume; // save last volume
      e.target.src = e.target.src.replace("volume.svg", "mute.svg");
      currentSong.volume = 0;
      document.querySelector(".range input").value = 0;
    } else {
      e.target.src = e.target.src.replace("mute.svg", "volume.svg");
      currentSong.volume = lastVolume; // restore
      document.querySelector(".range input").value = lastVolume * 100;
    }
  });
  
}
main();