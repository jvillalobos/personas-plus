window.addEventListener("load", async () => {
    let tabId = await browser.storage.local.get("popupSelectedTabId");
    document.querySelector(`#${tabId.popupSelectedTabId}`).checked = true;
});

var radios = document.querySelectorAll("input[type=radio][name=tabs]");
for (let tab of radios) {
    tab.addEventListener("change", () => {
        let checkedTabId = document.querySelector("input[name='tabs']:checked").id;
        browser.storage.local.set({"popupSelectedTabId": checkedTabId});
    });
}

async function getInstalled() {
    let addons = await browser.management.getAll();
    const parent = document.getElementById("installed");

    for (let addon of addons) {
        if (addon.type == "theme") {

            let div = document.createElement("li");
            let nameElem = document.createElement("div");

            let installImage = document.createElement("img");
            installImage.src = "images/custom.svg";
            installImage.style.marginRight = "10px";

            let name = document.createElement("span");
            name.textContent = addon.name;
            if (addon.enabled) {
                name.classList.add("installed-enabled");
            }

            nameElem.appendChild(installImage);
            nameElem.appendChild(name);
            div.appendChild(nameElem);
            parent.appendChild(div);

            nameElem.addEventListener("click", (event) => {
                // We need this hack because we use .update even for AMO themes.
                browser.theme.reset();
                browser.management.setEnabled(addon.id, false);
                browser.management.setEnabled(addon.id, true);
                document.querySelector(".installed-enabled").classList.remove("installed-enabled");
                event.target.classList.add("installed-enabled");
            });
        }
    }
}
getInstalled();

function enablePersona(persona) {
    let req = new XMLHttpRequest();
    req.open("GET", persona.theme_data.headerURL);
    req.responseType = 'blob';
    req.onload = function() {
        let blob = req.response;

        var reader = new FileReader();
        reader.addEventListener("load", () => {
            let data = {
                images: {
                    headerURL: reader.result,
                },
                colors: {
                    accentcolor: persona.theme_data.accentcolor || "white",
                    textcolor: persona.theme_data.textcolor || "black"
                }
            };
            browser.theme.update(data);
            browser.storage.local.set({
                "currentPersona": data
            });
        });
        reader.readAsDataURL(blob);
    };
    req.send();
}

function reset() {
    browser.theme.reset();
}

getAMOFeatured();
getAMOFavorites();

document.querySelector("#signInLink").addEventListener("click", () => {
    browser.runtime.sendMessage({
        "action": "openAMOAndMonitor",
    });
    window.close();
});

document.querySelector("#openCustom").addEventListener("click", () => {
    browser.tabs.create({
        url: "../custom/custom.html"
    });
    window.close();
});

document.querySelector("#resetTheme").addEventListener("click", (event) => {
    reset();
    event.preventDefault();
});

document.querySelector("#refresh-favorites").addEventListener("click", () => {
    getAMOFavorites(true);
});

document.querySelector("#refresh-featured").addEventListener("click", () => {
    getAMOFeatured(true);
});

browser.runtime.onMessage.addListener((message) => {
    if (message.favorites) {
        document.querySelector("#favorites").innerHTML = "";
        if (message.favorites.error && (message.favorites.error === "NotLoggedIn")) {
            document.querySelector("#refresh-favorites-img").classList.remove("refreshing");
            document.querySelector("#refresh-favorites").classList.add("hide");
            document.querySelector("#signInNote").classList.remove("hide");
        } else {
            let container = document.querySelector("#favorites");
            document.querySelector("#refresh-favorites").classList.remove("hide");
            addAMOPersonas(message.favorites, container);
            document.querySelector("#refresh-favorites-img").classList.remove("refreshing");
        }
    }
    if (message.featured) {
        let container = document.querySelector("#featured");
        document.querySelector("#featured").innerHTML = "";
        addAMOPersonas(message.featured, container);
        document.querySelector("#refresh-featured-img").classList.remove("refreshing");
    }
});

function getAMOFeatured(force = false) {
    browser.runtime.sendMessage({"action": "getFeatured", "force": force});
    document.querySelector("#refresh-featured-img").classList.add("refreshing");
}

function getAMOFavorites(force = false) {
    browser.runtime.sendMessage({"action": "getFavorites", "force": force});
    document.querySelector("#refresh-favorites").classList.remove("hide");
    document.querySelector("#refresh-favorites-img").classList.add("refreshing");
}

function addAMOPersonas(personas, container) {
    for (let entry of personas) {
        if (entry.addon.type === "persona" && entry.addon.status === "public") {
            let persona = entry.addon;
            let div = document.createElement("li");
            div.classList.add("card");
            let nameElem = document.createElement("div");
            nameElem.classList.add("entryHeader");
            nameElem.textContent = persona.name[persona.default_locale];

            let installImage = document.createElement("img");
            installImage.classList.add("installImage");
            installImage.src = "images/installed.svg";
            installImage.title = "Download and install from AMO";
            installImage.addEventListener("click", () => {
                browser.tabs.create({
                    url: `https://addons.mozilla.org/firefox/addon/${persona.slug}`
                });
                window.close();
            });
            nameElem.appendChild(installImage);

            let image = document.createElement("img");
            image.classList.add("previewImage");
            image.src = persona.theme_data.previewURL;
            image.title = "Apply this theme directly";
            let imageDiv = document.createElement("div");
            imageDiv.addEventListener("click", () => {
                enablePersona(persona);
            });
            imageDiv.appendChild(image);

            div.appendChild(imageDiv);
            div.appendChild(nameElem);
            container.appendChild(div);
        }
    }
}
