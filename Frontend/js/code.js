const urlBase = (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.origin.includes('lampproject38')))
  ? '/api/index.php'
  : 'http://142.93.57.56/api/index.php';

const loginUrlBase = urlBase;

let userId = 0;
let firstName = "";
let lastName = "";

function doLogin() {
  userId = 0;
  firstName = "";
  lastName = "";

  let loginInput = document.getElementById("loginName");
  let passwordInput = document.getElementById("loginPassword");
  let login = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value.trim() : "";

  document.getElementById("loginResult").innerHTML = "";

  let jsonPayload = JSON.stringify({ action: "login", login: login, password: password });
  let url = loginUrlBase;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          let jsonObject = JSON.parse(xhr.responseText);
          userId = jsonObject.id;

          if (userId < 1) {
            document.getElementById("loginResult").innerHTML =
              "<i class='bi bi-exclamation-circle-fill me-1'></i> User/Password combination incorrect";
            return;
          }

          firstName = jsonObject.firstName;
          lastName = jsonObject.lastName;

          saveCookie();
          window.location.href = "contacts.html";
        } else {
          document.getElementById("loginResult").innerHTML =
            "<i class='bi bi-exclamation-circle-fill me-1'></i> Login failed";
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    document.getElementById("loginResult").innerHTML = err.message;
  }
}
// Registration function, this function handles user registration by sending a POST request to the server with the provided username and password. It also includes input validation and error handling.
function doRegister(){
 let firstNameInput = document.getElementById("signupFirstName");
  let lastNameInput = document.getElementById("signupLastName");
  let loginInput = document.getElementById("signupName");
  let passwordInput = document.getElementById("signupPassword");
  let resultEl = document.getElementById("signupResult");

  let fName = firstNameInput ? firstNameInput.value.trim() : "";
  let lName = lastNameInput ? lastNameInput.value.trim() : "";
  let login = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value.trim() : "";

  resultEl.innerHTML = "";
  resultEl.className = "small fw-semibold";

  if (!fName || !lName || !login || !password) {
    resultEl.className = "small fw-semibold text-warning";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> All fields are required.";
    return;
  }

  // The PHP script uses password_hash() on the server, so pass plain text
  let jsonPayload = JSON.stringify({
    action: "register",
    firstName: fName,
    lastName: lName,
    login: login,
    password: password
  });

  let url = loginUrlBase; // Points to your /api/index.php
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200 || this.status === 201) {
          let jsonObject = {};
          try {
            jsonObject = JSON.parse(xhr.responseText);
          } catch (e) {
            jsonObject = {};
          }

          // Check if your API returns an error field in the payload
          if (jsonObject.error && jsonObject.error.length > 0) {
            resultEl.className = "small fw-semibold text-danger";
            resultEl.innerHTML = `<i class='bi bi-exclamation-circle-fill me-1'></i> ${jsonObject.error}`;
            return;
          }

          // Registration successful: show success and route to login
          resultEl.className = "small fw-semibold text-success";
          resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Account created! Redirecting to login...";
          
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1500);

        } else {
          try {
            let jsonObject = JSON.parse(xhr.responseText);
            resultEl.className = "small fw-semibold text-danger";
            resultEl.innerHTML = `<i class='bi bi-exclamation-circle-fill me-1'></i> ${jsonObject.error || "Registration failed."}`;
          } catch (e) {
            resultEl.className = "small fw-semibold text-danger";
            resultEl.innerHTML = "<i class='bi bi-exclamation-circle-fill me-1'></i> Registration failed.";
          }
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    resultEl.className = "small fw-semibold text-danger";
    resultEl.innerHTML = err.message;
  }  
}

function saveCookie() {
  let minutes = 20;
  let date = new Date();
  date.setTime(date.getTime() + minutes * 60 * 1000);
  document.cookie =
    "firstName=" +
    encodeURIComponent(firstName) +
    ",lastName=" +
    encodeURIComponent(lastName) +
    ",userId=" +
    userId +
    ";expires=" +
    date.toGMTString() +
    ";path=/";
}

function readCookie() {
  userId = -1;
  let data = document.cookie;
  let splits = data.split(";");
  for (var i = 0; i < splits.length; i++) {
    let pair = splits[i].trim();
    let tokens = pair.split(",");
    for (var j = 0; j < tokens.length; j++) {
      let keyVal = tokens[j].trim().split("=");
      if (keyVal[0] === "firstName") {
        firstName = decodeURIComponent(keyVal[1] || "");
      } else if (keyVal[0] === "lastName") {
        lastName = decodeURIComponent(keyVal[1] || "");
      } else if (keyVal[0] === "userId") {
        userId = parseInt(keyVal[1].trim());
      }
    }
  }

  if (userId < 0 || isNaN(userId)) {
    window.location.href = "index.html";
  } else {
    let userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.innerHTML = `<i class="bi bi-person-circle me-1 text-primary"></i> <span>Logged in as <strong class="text-white">${firstName} ${lastName}</strong></span>`;
    }
    searchColor();
  }
}

function doLogout() {
  userId = 0;
  firstName = "";
  lastName = "";
  document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  window.location.href = "index.html";
}

// function addColor() {
//   let newColorInput = document.getElementById("colorText");
//   let newColor = newColorInput ? newColorInput.value.trim() : "";
//   let resultEl = document.getElementById("colorAddResult");
//   resultEl.innerHTML = "";

//   if (!newColor) {
//     resultEl.className = "text-warning small fw-semibold";
//     resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Please enter a color name";
//     return;
//   }

//   let jsonPayload = JSON.stringify({ color: newColor });
//   let url = urlBase;

//   let xhr = new XMLHttpRequest();
//   xhr.open("POST", url, true);
//   xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
//   xhr.setRequestHeader("Authorization", "Bearer " + userId);
//   xhr.setRequestHeader("X-User-Id", userId);

//   try {
//     xhr.onreadystatechange = function () {
//       if (this.readyState === 4) {
//         if (this.status === 201 || this.status === 200) {
//           resultEl.className = "text-success-wcag small fw-semibold";
//           resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Color successfully added!";
//           newColorInput.value = "";
//           searchColor();
//         } else {
//           try {
//             let res = JSON.parse(xhr.responseText);
//             resultEl.className = "text-danger-wcag small fw-semibold";
//             resultEl.innerHTML = res.error || "Failed to add color";
//           } catch (e) {
//             resultEl.className = "text-danger-wcag small fw-semibold";
//             resultEl.innerHTML = "Error adding color";
//           }
//         }
//       }
//     };
//     xhr.send(jsonPayload);
//   } catch (err) {
//     resultEl.className = "text-danger-wcag small fw-semibold";
//     resultEl.innerHTML = err.message;
//   }
// }

// function searchColor() {
//   let srchInput = document.getElementById("searchText");
//   let srch = srchInput ? srchInput.value.trim() : "";
//   let resultSpan = document.getElementById("colorSearchResult");
//   resultSpan.innerHTML = "";

//   let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

//   let xhr = new XMLHttpRequest();
//   xhr.open("GET", url, true);
//   xhr.setRequestHeader("Authorization", "Bearer " + userId);
//   xhr.setRequestHeader("X-User-Id", userId);

//   try {
//     xhr.onreadystatechange = function () {
//       if (this.readyState === 4 && this.status === 200) {
//         resultSpan.innerHTML = "<i class='bi bi-check-circle me-1'></i> Results updated";
//         let jsonObject = JSON.parse(xhr.responseText);
//         let targetP = document.getElementById("colorList") || document.getElementsByTagName("p")[0];

//         let colors = jsonObject.colors || [];
//         if (colors.length === 0 && Array.isArray(jsonObject.results) && jsonObject.results.length > 0) {
//           colors = jsonObject.results.map(name => ({ id: null, name: name }));
//         }

//         if (colors.length === 0 || jsonObject.error === "No Records Found") {
//           if (targetP) targetP.innerHTML = `<div class="text-secondary-contrast small italic py-2"><i class="bi bi-info-circle me-1"></i> No matching colors found.</div>`;
//           return;
//         }

//         let colorList = "";
//         for (let i = 0; i < colors.length; i++) {
//           let c = colors[i];
//           let colorName = typeof c === 'string' ? c : c.name;
//           let colorId = (typeof c === 'object' && c.id) ? c.id : null;

//           colorList += `<span class="badge rounded-pill bg-dark-subtle text-body border border-secondary px-3 py-2 fs-6 shadow-sm d-inline-flex align-items-center me-2 mb-2">
//             <span class="d-inline-block rounded-circle me-2 border" style="width: 14px; height: 14px; background-color: ${colorName};"></span>
//             <span class="me-2">${colorName}</span>
//             <button type="button" class="btn-close btn-close-white" style="font-size: 0.65rem;" onclick="deleteColor(${colorId ? colorId : `'${colorName.replace(/'/g, "\\'")}'`});" title="Delete Color"></button>
//           </span>`;
//         }

//         if (targetP) {
//           targetP.innerHTML = colorList;
//         }
//       }
//     };
//     xhr.send();
//   } catch (err) {
//     resultSpan.innerHTML = err.message;
//   }
// }

// function deleteColor(identifier) {
//   if (!identifier && identifier !== 0) return;

//   let param = (typeof identifier === 'number') ? ("id=" + identifier) : ("name=" + encodeURIComponent(identifier));
//   let url = urlBase + "?" + param;

//   let xhr = new XMLHttpRequest();
//   xhr.open("DELETE", url, true);
//   xhr.setRequestHeader("Authorization", "Bearer " + userId);
//   xhr.setRequestHeader("X-User-Id", userId);

//   try {
//     xhr.onreadystatechange = function () {
//       if (this.readyState === 4 && this.status === 200) {
//         searchColor();
//       }
//     };
//     xhr.send();
//   } catch (err) {
//     console.error(err);
//   }
// }
