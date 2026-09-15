const state = {
  step: 1,
  contact: null,
  domain: null,
  formation: null,
  session: null,
  type: null
};

const colors = {
  "Sécurité au travail": "#8064a2",
  "Agriculture": "#f4a142",
  "Paysages / Environnement": "#70ad47",
  "Agroalimentaire": "#ffc000",
  "Management / Communication": "#42a5b3"
};

let formations = [];
let sessions = [];

// Demande à Grist l'accès complet au document
grist.ready({
  requiredAccess: "full"
});

// Transforme correctement le résultat de fetchTable()
// en une liste de lignes utilisable par notre interface.
function rows(table) {
  if (!table) return [];

  // Cas où Grist renvoie déjà un tableau de lignes
  if (Array.isArray(table)) {
    return table;
  }

  // Cas normal de fetchTable : objet contenant des colonnes
  const ids = Array.isArray(table.id) ? table.id : [];

  if (ids.length === 0) {
    return [];
  }

  return ids.map((id, index) => {
    const row = { id: id };

    Object.keys(table).forEach((key) => {
      if (key !== "id" && Array.isArray(table[key])) {
        row[key] = table[key][index];
      }
    });

    return row;
  });
}

// Nettoyage pour éviter les problèmes d'espaces
function clean(value) {
  return String(value ?? "").trim();
}

async function load() {
  try {
    const formationsTable =
      await grist.docApi.fetchTable("FORMATIONS");

    const sessionsTable =
      await grist.docApi.fetchTable("SESSIONS");

    formations = rows(formationsTable);
    sessions = rows(sessionsTable);

    console.log("FORMATIONS chargées :", formations);
    console.log("SESSIONS chargées :", sessions);

  } catch (e) {
    console.error("Erreur chargement Grist :", e);

    showMsg(
      "Impossible de lire les tables FORMATIONS et SESSIONS.",
      false
    );
  }

  renderContact();
  renderDomains();
  renderTypes();
}

function button(text, cls = "", onClick, color) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "choice " + cls;
  b.innerHTML = text;

  if (color) {
    b.style.setProperty("--accent", color);
  }

  b.onclick = onClick;
  return b;
}

function selectButton(container, value, setter, color) {
  [...container.children].forEach((x) =>
    x.classList.remove("selected")
  );

  value.classList.add("selected");
  setter();

  if (color) {
    value.style.borderColor = color;
  }
}

function renderContact() {
  const box = document.getElementById("contactChoices");
  if (!box) return;

  box.innerHTML = "";

  [
    "Bruno",
    "Claire",
    "Stéphanie",
    "Cécile",
    "Hélène",
    "Séverine",
    "Laurène",
    "Autre"
  ].forEach((name) => {
    const b = button("♟ " + name, "", () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      b.classList.add("selected");
      state.contact = name;

      const next = document.getElementById("next1");
      if (next) next.disabled = false;
    });

    box.appendChild(b);
  });
}

function renderDomains() {
  const box = document.getElementById("domainChoices");
  if (!box) return;

  box.innerHTML = "";

  Object.keys(colors).forEach((domain) => {
    const b = button(domain, "", () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      b.classList.add("selected");
      b.style.borderColor = colors[domain];

      state.domain = domain;
      state.formation = null;
      state.session = null;

      const next = document.getElementById("next2");
      if (next) next.disabled = false;
    }, colors[domain]);

    box.appendChild(b);
  });
}

function renderFormations() {
  const box = document.getElementById("formationChoices");
  if (!box) return;

  box.innerHTML = "";

  const selectedDomain = clean(state.domain);

  const list = formations.filter((f) => {
    const sameDomain =
      clean(f.Domaine).toLowerCase() ===
      selectedDomain.toLowerCase();

    const active =
      clean(f.Active).toLowerCase() !== "non";

    return sameDomain && active;
  });

  if (list.length === 0) {
    const p = document.createElement("p");
    p.textContent =
      "Aucune formation trouvée pour cette catégorie.";
    box.appendChild(p);
    return;
  }

  list.forEach((f) => {
    const name = clean(f.Formation);

    if (!name) return;

    const b = button(name, "", () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      b.classList.add("selected");

      state.formation = name;
      state.session = null;

      const next = document.getElementById("next3");
      if (next) next.disabled = false;
    }, colors[state.domain]);

    box.appendChild(b);
  });

  const other = button(
    "Besoin hors catalogue",
    "other",
    () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      other.classList.add("selected");

      state.formation = "Besoin hors catalogue";
      state.session = "Date à définir / autre demande";

      const next = document.getElementById("next3");
      if (next) next.disabled = false;
    }
  );

  box.appendChild(other);
}

function renderSessions() {
  const box = document.getElementById("sessionChoices");
  if (!box) return;

  box.innerHTML = "";

  let list = [];

  if (state.formation !== "Besoin hors catalogue") {
    list = sessions.filter((s) => {
      return (
        clean(s.Formation).toLowerCase() ===
        clean(state.formation).toLowerCase()
      );
    });
  }

  list.forEach((s) => {
    const label = clean(
      s.Libelle_session ??
      s["Libellé_session"] ??
      s.Session ??
      s.Date
    );

    if (!label) return;

    const b = button(label, "", () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      b.classList.add("selected");
      state.session = label;

      const next = document.getElementById("next4");
      if (next) next.disabled = false;
    });

    box.appendChild(b);
  });

  const other = button(
    "Date à définir / autre demande",
    "other",
    () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      other.classList.add("selected");
      state.session = "Date à définir / autre demande";

      const next = document.getElementById("next4");
      if (next) next.disabled = false;
    }
  );

  box.appendChild(other);
}

function renderTypes() {
  const box = document.getElementById("typeChoices");
  if (!box) return;

  box.innerHTML = "";

  ["Particulier", "Entreprise"].forEach((type) => {
    const b = button(type, "", () => {
      [...box.children].forEach((x) =>
        x.classList.remove("selected")
      );

      b.classList.add("selected");
      state.type = type;

      const companyFields =
        document.getElementById("companyFields");

      if (companyFields) {
        companyFields.style.display =
          type === "Entreprise" ? "" : "none";
      }

      const next = document.getElementById("next5");
      if (next) next.disabled = false;
    });

    box.appendChild(b);
  });
}

function go(step) {
  document
    .querySelectorAll(".step")
    .forEach((el) => el.classList.remove("active"));

  const target = document.getElementById("step" + step);

  if (target) {
    target.classList.add("active");
  }

  state.step = step;

  const progress = document.getElementById("progress");
  if (progress) {
    progress.style.width =
      Math.min(100, (step / 7) * 100) + "%";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function value(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function dateToGrist(v) {
  if (!v) return null;

  const d = new Date(v + "T00:00:00");

  if (isNaN(d.getTime())) return null;

  return Math.floor(d.getTime() / 1000);
}

function showMsg(text, ok = true) {
  const el = document.getElementById("message");

  if (!el) return;

  el.textContent = text;
  el.className = ok ? "message success" : "message error";
  el.style.display = "block";
}

async function saveDemand() {
  try {
    const now = new Date();

    const numero =
      "FC-" +
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "-" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const fields = {
      Numero_dossier: numero,
      Date_premier_contact: Math.floor(Date.now() / 1000),

      Nom: value("nom"),
      Prenom: value("prenom"),

      Type_contact: state.type || "",

      Entreprise_organisme:
        value("entreprise"),

      Entreprise_pour_salaries:
        value("entrepriseSalaries"),

      Adresse: value("adresse"),
      Code_postal: value("codePostal"),
      Ville: value("ville"),
      Email: value("email"),
      Telephone: value("telephone"),

      Date_naissance:
        dateToGrist(value("dateNaissance")),

      Profil_situation:
        value("profil"),

      Premier_contact_par:
        state.contact || "",

      Charge_ingenierie:
        value("chargeIngenierie"),

      Domaine:
        state.domain || "",

      Formation:
        state.formation || "",

      Besoin_hors_catalogue:
        value("besoinHorsCatalogue"),

      Financement:
        value("financement"),

      Session_souhaitee:
        state.session || "",

      Date_souhaitee_libre:
        value("dateSouhaiteeLibre"),

      Date_prochaine_relance:
        dateToGrist(value("dateRelance")),

      Statut:
        value("statut") || "Nouveau",

      Inscription:
        value("inscription"),

      Derniere_action:
        value("derniereAction"),

      Commentaires:
        value("commentaires")
    };

    await grist.docApi.applyUserActions([
      ["AddRecord", "DEMANDES", null, fields]
    ]);

    showMsg(
      "La demande a bien été enregistrée.",
      true
    );

  } catch (e) {
    console.error(e);

    showMsg(
      "Erreur lors de l'enregistrement : " +
      (e.message || e),
      false
    );
  }
}

// Navigation
document.addEventListener("DOMContentLoaded", () => {

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  bind("next1", () => go(2));

  bind("next2", () => {
    renderFormations();
    go(3);
  });

  bind("next3", () => {
    renderSessions();
    go(4);
  });

  bind("next4", () => go(5));
  bind("next5", () => go(6));
  bind("next6", () => go(7));

  bind("back2", () => go(1));
  bind("back3", () => go(2));
  bind("back4", () => go(3));
  bind("back5", () => go(4));
  bind("back6", () => go(5));
  bind("back7", () => go(6));

  bind("saveDemand", saveDemand);

  load();
});
