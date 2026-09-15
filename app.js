/* =========================================================
   FORMATIONS COURTES - CFA NORD OUEST AVEYRON
   Mini logiciel connecté à Grist
========================================================= */

const COLORS = {
  "Sécurité au travail": "#8064a2",
  "Agriculture": "#f4a142",
  "Paysages / Environnement": "#70ad47",
  "Agroalimentaire": "#ffc000",
  "Management / Communication": "#42a5b3"
};

const CONTACT_PEOPLE = [
  "Bruno",
  "Claire",
  "Stéphanie",
  "Cécile",
  "Hélène",
  "Séverine",
  "Laurène",
  "Autre"
];

let formations = [];
let sessions = [];
let demandes = [];

let currentContactId = null;
let currentStatusFilter = "";

const state = {
  step: 1,
  contact: null,
  domain: null,
  formation: null,
  session: null,
  type: null
};


/* =========================================================
   CONNEXION GRIST
========================================================= */

grist.ready({
  requiredAccess: "full"
});


function rows(table) {

  if (!table) return [];

  if (Array.isArray(table)) {
    return table;
  }

  const ids = Array.isArray(table.id) ? table.id : [];

  return ids.map((id, index) => {

    const row = { id };

    Object.keys(table).forEach(key => {

      if (key !== "id" && Array.isArray(table[key])) {
        row[key] = table[key][index];
      }

    });

    return row;

  });
}


function clean(value) {

  if (
    value === null ||
    value === undefined ||
    value === false
  ) {
    return "";
  }

  return String(value).trim();
}


async function loadAllData() {

  try {

    const [
      formationsTable,
      sessionsTable,
      demandesTable
    ] = await Promise.all([
      grist.docApi.fetchTable("FORMATIONS"),
      grist.docApi.fetchTable("SESSIONS"),
      grist.docApi.fetchTable("DEMANDES")
    ]);

    formations = rows(formationsTable);
    sessions = rows(sessionsTable);
    demandes = rows(demandesTable);

    console.log("FORMATIONS", formations);
    console.log("SESSIONS", sessions);
    console.log("DEMANDES", demandes);

    updateHome();
    updateSettings();

  } catch (error) {

    console.error(error);

    alert(
      "Le logiciel n'arrive pas à lire les données Grist. " +
      "Vérifiez que le widget dispose de l'accès complet au document."
    );

  } finally {

    const loading = document.getElementById("loadingOverlay");

    if (loading) {
      loading.style.display = "none";
    }

  }

}


/* =========================================================
   PAGES
========================================================= */

function showPage(name) {

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  const page = document.getElementById("page-" + name);

  if (page) {
    page.classList.add("active-page");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (name === "home") {
    updateHome();
  }

}


/* =========================================================
   ACCUEIL
========================================================= */

function updateHome() {

  const nouveaux = demandes.filter(d =>
    clean(d.Statut) === "Nouveau"
  ).length;

  const inscrits = demandes.filter(d =>
    clean(d.Statut) === "Inscrit" ||
    clean(d.Inscription) === "Oui"
  ).length;

  const late = getRelances().late.length;

  setText("homeNewCount", nouveaux);
  setText("homeRegisteredCount", inscrits);
  setText("homeLateCount", late);

  const badge = document.getElementById("relanceBadge");

  if (badge) {

    if (late > 0) {
      badge.textContent = late;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }

  }

}


function setText(id, text) {

  const element = document.getElementById(id);

  if (element) {
    element.textContent = text;
  }

}


/* =========================================================
   NOUVEAU CONTACT
========================================================= */

function startNewContact() {

  resetNewContact();

  showPage("new");

  go(1);

}


function resetNewContact() {

  state.step = 1;
  state.contact = null;
  state.domain = null;
  state.formation = null;
  state.session = null;
  state.type = null;

  document.querySelectorAll(
    "#page-new input, #page-new textarea"
  ).forEach(el => {
    el.value = "";
  });

  document.querySelectorAll(
    "#page-new select"
  ).forEach(el => {
    el.selectedIndex = 0;
  });

  [
    "next1",
    "next2",
    "next3",
    "next4",
    "next5"
  ].forEach(id => {

    const button = document.getElementById(id);

    if (button) button.disabled = true;

  });

  const companyFields =
    document.getElementById("companyFields");

  if (companyFields) {
    companyFields.style.display = "none";
  }

  const message = document.getElementById("message");

  if (message) {
    message.style.display = "none";
  }

  renderContact();
  renderDomains();
  renderTypes();

}


function createChoice(text, click, color = null) {

  const button = document.createElement("button");

  button.type = "button";
  button.className = "choice";
  button.textContent = text;

  if (color) {
    button.style.setProperty("--accent", color);
  }

  button.onclick = click;

  return button;

}


function clearSelected(container) {

  if (!container) return;

  container.querySelectorAll(".choice").forEach(button => {
    button.classList.remove("selected");
  });

}


function renderContact() {

  const box = document.getElementById("contactChoices");

  if (!box) return;

  box.innerHTML = "";

  CONTACT_PEOPLE.forEach(name => {

    const button = createChoice(
      "👤 " + name,
      () => {

        clearSelected(box);

        button.classList.add("selected");

        state.contact = name;

        document.getElementById("next1").disabled = false;

      }
    );

    box.appendChild(button);

  });

}


function renderDomains() {

  const box = document.getElementById("domainChoices");

  if (!box) return;

  box.innerHTML = "";

  Object.keys(COLORS).forEach(domain => {

    const button = createChoice(
      domain,
      () => {

        clearSelected(box);

        button.classList.add("selected");

        state.domain = domain;
        state.formation = null;
        state.session = null;

        document.getElementById("next2").disabled = false;

      },
      COLORS[domain]
    );

    button.style.borderLeftColor = COLORS[domain];

    box.appendChild(button);

  });

}


function renderFormations() {

  const box =
    document.getElementById("formationChoices");

  if (!box) return;

  box.innerHTML = "";

  const list = formations.filter(f => {

    return (
      clean(f.Domaine).toLowerCase() ===
      clean(state.domain).toLowerCase()
    ) &&
    clean(f.Active).toLowerCase() !== "non";

  });

  if (!list.length) {

    const info = document.createElement("p");

    info.textContent =
      "Aucune formation trouvée dans cette catégorie.";

    box.appendChild(info);

  }

  list.forEach(formation => {

    const name = clean(formation.Formation);

    if (!name) return;

    const button = createChoice(
      name,
      () => {

        clearSelected(box);

        button.classList.add("selected");

        state.formation = name;
        state.session = null;

        document.getElementById("next3").disabled = false;

      },
      COLORS[state.domain]
    );

    box.appendChild(button);

  });


  const other = createChoice(
    "➕ Besoin hors catalogue",
    () => {

      clearSelected(box);

      other.classList.add("selected");

      state.formation = "Besoin hors catalogue";
      state.session = "Date à définir / autre demande";

      document.getElementById("next3").disabled = false;

    }
  );

  other.classList.add("other");

  box.appendChild(other);

}


function renderSessions() {

  const box =
    document.getElementById("sessionChoices");

  if (!box) return;

  box.innerHTML = "";

  const list = sessions.filter(session => {

    return (
      clean(session.Formation).toLowerCase() ===
      clean(state.formation).toLowerCase()
    );

  });

  list.forEach(session => {

    const label = getSessionLabel(session);

    if (!label) return;

    const button = createChoice(
      "📅 " + label,
      () => {

        clearSelected(box);

        button.classList.add("selected");

        state.session = label;

        document.getElementById("next4").disabled = false;

      }
    );

    box.appendChild(button);

  });


  const other = createChoice(
    "📝 Date à définir / autre demande",
    () => {

      clearSelected(box);

      other.classList.add("selected");

      state.session = "Date à définir / autre demande";

      document.getElementById("next4").disabled = false;

    }
  );

  other.classList.add("other");

  box.appendChild(other);

}


function getSessionLabel(session) {

  return clean(
    session.Libelle_session ??
    session["Libellé_session"] ??
    session.Session ??
    session.Date ??
    session.Date_session
  );

}


function renderTypes() {

  const box = document.getElementById("typeChoices");

  if (!box) return;

  box.innerHTML = "";

  ["Particulier", "Entreprise"].forEach(type => {

    const button = createChoice(
      type === "Particulier"
        ? "👤 Particulier"
        : "🏢 Entreprise",
      () => {

        clearSelected(box);

        button.classList.add("selected");

        state.type = type;

        const companyFields =
          document.getElementById("companyFields");

        if (companyFields) {

          companyFields.style.display =
            type === "Entreprise"
              ? "block"
              : "none";

        }

        document.getElementById("next5").disabled = false;

      }
    );

    box.appendChild(button);

  });

}


function go(step) {

  document.querySelectorAll(".step").forEach(el => {
    el.classList.remove("active");
  });

  const target =
    document.getElementById("step" + step);

  if (target) {
    target.classList.add("active");
  }

  state.step = step;

  const progress =
    document.getElementById("progress");

  if (progress) {

    progress.style.width =
      Math.round((step / 7) * 100) + "%";

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


function dateToGrist(dateValue) {

  if (!dateValue) return null;

  const date =
    new Date(dateValue + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor(date.getTime() / 1000);

}


async function saveDemand() {

  const button =
    document.getElementById("saveDemand");

  if (button) {
    button.disabled = true;
    button.textContent = "Enregistrement...";
  }

  try {

    const now = new Date();

    const numero =
      "FC-" +
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") + "-" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const fields = {

      Numero_dossier: numero,

      Date_premier_contact:
        Math.floor(Date.now() / 1000),

      Nom: value("nom"),
      Prenom: value("prenom"),

      Type_contact:
        state.type || "",

      Entreprise_organisme:
        value("entreprise"),

      Entreprise_pour_salaries:
        value("entrepriseSalaries"),

      Adresse:
        value("adresse"),

      Code_postal:
        value("codePostal"),

      Ville:
        value("ville"),

      Email:
        value("email"),

      Telephone:
        value("telephone"),

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
      [
        "AddRecord",
        "DEMANDES",
        null,
        fields
      ]
    ]);


    await refreshDemandes();


    showMessage(
      "✓ La demande a bien été enregistrée."
    );


    setTimeout(() => {
      showPage("home");
    }, 1200);


  } catch (error) {

    console.error(error);

    showMessage(
      "Impossible d'enregistrer la demande : " +
      (error.message || error),
      false
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "✓ Enregistrer la demande";
    }

  }

}


function showMessage(text, success = true) {

  const element =
    document.getElementById("message");

  if (!element) return;

  element.textContent = text;

  element.className =
    success
      ? "message success"
      : "message error";

  element.style.display = "block";

}


/* =========================================================
   ACTUALISATION DES DEMANDES
========================================================= */

async function refreshDemandes() {

  try {

    const table =
      await grist.docApi.fetchTable("DEMANDES");

    demandes = rows(table);

    updateHome();

  } catch (error) {

    console.error(
      "Actualisation impossible",
      error
    );

  }

}


/* =========================================================
   SUIVI DES CONTACTS
========================================================= */

async function openContacts() {

  await refreshDemandes();

  currentStatusFilter = "";

  showPage("contacts");

  const search =
    document.getElementById("contactSearch");

  if (search) {
    search.value = "";
  }

  document.querySelectorAll(".filter").forEach(button => {

    button.classList.toggle(
      "active",
      clean(button.dataset.status) === ""
    );

  });

  renderContacts();

}


function renderContacts() {

  const box =
    document.getElementById("contactsList");

  if (!box) return;

  box.innerHTML = "";

  const search =
    clean(value("contactSearch")).toLowerCase();

  let list = demandes.filter(contact => {

    const statusOK =
      !currentStatusFilter ||
      clean(contact.Statut) === currentStatusFilter;

    const searchable = [
      contact.Nom,
      contact.Prenom,
      contact.Entreprise_organisme,
      contact.Formation,
      contact.Domaine,
      contact.Email,
      contact.Telephone,
      contact.Numero_dossier
    ]
      .map(clean)
      .join(" ")
      .toLowerCase();

    const searchOK =
      !search ||
      searchable.includes(search);

    return statusOK && searchOK;

  });


  list = list.sort((a, b) =>
    Number(b.id || 0) - Number(a.id || 0)
  );


  setText(
    "contactsCount",
    list.length +
    (list.length > 1
      ? " contacts trouvés"
      : " contact trouvé")
  );


  if (!list.length) {

    box.innerHTML = `
      <div class="detail-card">
        Aucun contact ne correspond à votre recherche.
      </div>
    `;

    return;

  }


  list.forEach(contact => {

    const card =
      document.createElement("div");

    card.className = "contact-card";

    const color =
      COLORS[clean(contact.Domaine)] ||
      "#9ba8ae";

    card.style.setProperty(
      "--domain-color",
      color
    );


    card.innerHTML = `

      <div>
        <div class="contact-name">
          ${escapeHtml(fullName(contact))}
        </div>

        <div class="contact-company">
          ${escapeHtml(
            clean(contact.Entreprise_organisme) ||
            "Particulier"
          )}
        </div>
      </div>


      <div>

        <div class="contact-training">
          ${escapeHtml(
            clean(contact.Formation) ||
            "Formation non renseignée"
          )}
        </div>

        <span
          class="domain-pill"
          style="--domain-color:${color}"
        >
          ${escapeHtml(
            clean(contact.Domaine) ||
            "Sans domaine"
          )}
        </span>

        <div class="contact-small">
          📅 ${escapeHtml(
            clean(contact.Session_souhaitee) ||
            "Date non définie"
          )}
        </div>

      </div>


      <div>

        ${statusBadge(contact.Statut)}

        <div class="contact-small">
          👤 ${
            escapeHtml(
              clean(contact.Charge_ingenierie) ||
              "Non attribué"
            )
          }
        </div>

        <div class="contact-small">
          🔔 ${
            formatDate(contact.Date_prochaine_relance) ||
            "Pas de relance"
          }
        </div>

      </div>


      <button class="open-contact-btn">
        Ouvrir la fiche →
      </button>

    `;


    card
      .querySelector(".open-contact-btn")
      .onclick = () =>
        openContactDetail(contact.id);


    box.appendChild(card);

  });

}


/* =========================================================
   FICHE CONTACT
========================================================= */

function openContactDetail(id) {

  const contact =
    demandes.find(d =>
      String(d.id) === String(id)
    );

  if (!contact) return;

  currentContactId = contact.id;

  showPage("contact-detail");

  setText(
    "detailTitle",
    fullName(contact)
  );

  setText(
    "detailSubtitle",
    clean(contact.Numero_dossier)
  );

  renderContactDetail(contact);

}


function renderContactDetail(contact) {

  const box =
    document.getElementById("contactDetail");

  if (!box) return;

  const color =
    COLORS[clean(contact.Domaine)] ||
    "#42a5b3";


  box.innerHTML = `

    <div class="detail-card">

      <h3>👤 Contact</h3>

      ${infoRow("Nom", fullName(contact))}

      ${infoRow(
        "Entreprise",
        clean(contact.Entreprise_organisme)
      )}

      ${infoRow(
        "Téléphone",
        clean(contact.Telephone)
      )}

      ${infoRow(
        "Mail",
        clean(contact.Email)
      )}

      ${infoRow(
        "Adresse",
        [
          clean(contact.Adresse),
          clean(contact.Code_postal),
          clean(contact.Ville)
        ].filter(Boolean).join(" ")
      )}

      ${infoRow(
        "Profil",
        clean(contact.Profil_situation)
      )}

    </div>


    <div
      class="detail-card"
      style="border-top:6px solid ${color}"
    >

      <h3>🎓 Demande de formation</h3>

      ${infoRow(
        "Domaine",
        clean(contact.Domaine)
      )}

      ${infoRow(
        "Formation",
        clean(contact.Formation)
      )}

      ${infoRow(
        "Session",
        clean(contact.Session_souhaitee)
      )}

      ${infoRow(
        "Financement",
        clean(contact.Financement)
      )}

      ${infoRow(
        "Chargé d'ingénierie",
        clean(contact.Charge_ingenierie)
      )}

      ${infoRow(
        "Premier contact par",
        clean(contact.Premier_contact_par)
      )}

    </div>


    <div class="detail-card">

      <h3>📌 Suivi du dossier</h3>

      <div class="field">
        <label>Statut</label>

        <select id="editStatus">
          ${statusOptions(contact.Statut)}
        </select>
      </div>

      <div class="field" style="margin-top:15px">
        <label>Prochaine relance</label>

        <input
          id="editRelance"
          type="date"
          value="${dateInputValue(
            contact.Date_prochaine_relance
          )}"
        >
      </div>

      <div class="field" style="margin-top:15px">
        <label>Inscription</label>

        <select id="editInscription">
          ${simpleOptions(
            ["", "Oui", "Non", "En attente"],
            contact.Inscription
          )}
        </select>
      </div>

      <button
        id="saveContactFollowup"
        class="save-btn"
        style="margin-top:20px"
      >
        ✓ Enregistrer le suivi
      </button>

    </div>


    <div class="detail-card">

      <h3>📝 Notes</h3>

      <div class="field">
        <label>Dernière action</label>

        <input
          id="editLastAction"
          type="text"
          value="${escapeAttribute(
            clean(contact.Derniere_action)
          )}"
        >
      </div>

      <div class="field" style="margin-top:15px">
        <label>Commentaires</label>

        <textarea id="editComments">${
          escapeHtml(
            clean(contact.Commentaires)
          )
        }</textarea>
      </div>

    </div>


    <div class="detail-card full">

      <h3>⚡ Actions rapides</h3>

      <div class="detail-actions">

        <button
          class="action-btn action-orange"
          data-quick-status="À rappeler"
        >
          🔔 À rappeler
        </button>

        <button
          class="action-btn action-blue"
          data-quick-status="Dossier en cours"
        >
          📂 Dossier en cours
        </button>

        <button
          class="action-btn action-green"
          data-quick-status="Inscrit"
        >
          ✅ Inscrit
        </button>

        <button
          class="action-btn action-red"
          data-quick-status="Abandon"
        >
          ✕ Abandon
        </button>

      </div>

    </div>

  `;


  document
    .getElementById("saveContactFollowup")
    .onclick = saveContactFollowup;


  box
    .querySelectorAll("[data-quick-status]")
    .forEach(button => {

      button.onclick = async () => {

        const status =
          button.dataset.quickStatus;

        const select =
          document.getElementById("editStatus");

        if (select) {
          select.value = status;
        }

        if (status === "Inscrit") {

          const inscription =
            document.getElementById(
              "editInscription"
            );

          if (inscription) {
            inscription.value = "Oui";
          }

        }

        await saveContactFollowup();

      };

    });

}


async function saveContactFollowup() {

  if (!currentContactId) return;

  try {

    const fields = {

      Statut:
        value("editStatus"),

      Date_prochaine_relance:
        dateToGrist(
          value("editRelance")
        ),

      Inscription:
        value("editInscription"),

      Derniere_action:
        value("editLastAction"),

      Commentaires:
        value("editComments")

    };


    await grist.docApi.applyUserActions([
      [
        "UpdateRecord",
        "DEMANDES",
        Number(currentContactId),
        fields
      ]
    ]);


    await refreshDemandes();


    const updated =
      demandes.find(d =>
        String(d.id) ===
        String(currentContactId)
      );


    if (updated) {

      renderContactDetail(updated);

      setText(
        "detailTitle",
        fullName(updated)
      );

    }


    alert("✓ Le suivi du contact est enregistré.");


  } catch (error) {

    console.error(error);

    alert(
      "Impossible d'enregistrer la modification."
    );

  }

}


/* =========================================================
   RELANCES
========================================================= */

function getRelances() {

  const today = startOfToday();

  const late = [];
  const todayList = [];
  const future = [];


  demandes.forEach(contact => {

    const timestamp =
      Number(contact.Date_prochaine_relance);

    if (!timestamp) return;

    const status =
      clean(contact.Statut);

    if (
      status === "Inscrit" ||
      status === "Abandon" ||
      status === "Formation réalisée"
    ) {
      return;
    }

    const date =
      new Date(timestamp * 1000);

    const compare =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );


    if (compare < today) {
      late.push(contact);
    }

    else if (
      compare.getTime() ===
      today.getTime()
    ) {
      todayList.push(contact);
    }

    else {
      future.push(contact);
    }

  });


  const sortByDate = (a, b) =>
    Number(a.Date_prochaine_relance) -
    Number(b.Date_prochaine_relance);


  return {
    late: late.sort(sortByDate),
    today: todayList.sort(sortByDate),
    future: future.sort(sortByDate)
  };

}


async function openRelances() {

  await refreshDemandes();

  showPage("relances");

  const data = getRelances();

  renderRelanceList(
    "lateRelances",
    data.late
  );

  renderRelanceList(
    "todayRelances",
    data.today
  );

  renderRelanceList(
    "futureRelances",
    data.future
  );

}


function renderRelanceList(id, list) {

  const box = document.getElementById(id);

  if (!box) return;

  box.innerHTML = "";


  if (!list.length) {

    box.innerHTML = `
      <div class="relance-info">
        Aucune relance.
      </div>
    `;

    return;

  }


  list.forEach(contact => {

    const item =
      document.createElement("div");

    item.className = "relance-item";

    item.innerHTML = `

      <div class="relance-name">
        ${escapeHtml(fullName(contact))}
      </div>

      <div class="relance-info">
        🎓 ${escapeHtml(
          clean(contact.Formation)
        )}
      </div>

      <div class="relance-info">
        📅 ${formatDate(
          contact.Date_prochaine_relance
        )}
      </div>

    `;

    item.onclick = () =>
      openContactDetail(contact.id);

    box.appendChild(item);

  });

}


/* =========================================================
   SESSIONS / INSCRIPTIONS
========================================================= */

async function openSessions() {

  await refreshDemandes();

  showPage("sessions");

  renderSessionsDashboard();

}


function renderSessionsDashboard() {

  const box =
    document.getElementById(
      "sessionsDashboard"
    );

  if (!box) return;

  box.innerHTML = "";


  const sessionMap = new Map();


  demandes
    .filter(contact =>
      clean(contact.Session_souhaitee)
    )
    .forEach(contact => {

      const key =
        clean(contact.Formation) +
        "||" +
        clean(contact.Session_souhaitee);

      if (!sessionMap.has(key)) {

        sessionMap.set(key, {
          formation:
            clean(contact.Formation),
          session:
            clean(contact.Session_souhaitee),
          domaine:
            clean(contact.Domaine),
          contacts: []
        });

      }

      sessionMap
        .get(key)
        .contacts
        .push(contact);

    });


  if (!sessionMap.size) {

    box.innerHTML = `
      <div class="detail-card">
        Aucune session liée à un contact pour le moment.
      </div>
    `;

    return;

  }


  [...sessionMap.values()]
    .forEach(group => {

      const card =
        document.createElement("div");

      card.className = "session-card";

      const color =
        COLORS[group.domaine] ||
        "#42a5b3";

      card.style.setProperty(
        "--domain-color",
        color
      );


      const inscrits =
        group.contacts.filter(contact =>
          clean(contact.Statut) === "Inscrit" ||
          clean(contact.Inscription) === "Oui"
        );


      card.innerHTML = `

        <div class="session-header">

          <div>

            <div class="session-title">
              ${escapeHtml(group.formation)}
            </div>

            <div class="session-date">
              📅 ${escapeHtml(group.session)}
            </div>

          </div>

          <div class="session-count">
            ${inscrits.length} inscrit${
              inscrits.length > 1 ? "s" : ""
            }
          </div>

        </div>

        <div class="participant-list">

          ${
            group.contacts.map(contact => `

              <div
                class="participant"
                data-contact="${contact.id}"
              >
                👤
                <strong>
                  ${escapeHtml(fullName(contact))}
                </strong>
                —
                ${escapeHtml(
                  clean(contact.Statut) ||
                  "Nouveau"
                )}
              </div>

            `).join("")
          }

        </div>

      `;


      card
        .querySelectorAll("[data-contact]")
        .forEach(element => {

          element.style.cursor = "pointer";

          element.onclick = () =>
            openContactDetail(
              element.dataset.contact
            );

        });


      box.appendChild(card);

    });

}


/* =========================================================
   TABLEAU DE BORD
========================================================= */

async function openDashboard() {

  await refreshDemandes();

  showPage("dashboard");

  renderDashboard();

}


function renderDashboard() {

  const stats =
    document.getElementById("statsCards");

  if (!stats) return;


  const total =
    demandes.length;

  const nouveaux =
    countStatus("Nouveau");

  const dossiers =
    countStatus("Dossier en cours");

  const inscrits =
    demandes.filter(contact =>
      clean(contact.Statut) === "Inscrit" ||
      clean(contact.Inscription) === "Oui"
    ).length;


  stats.innerHTML = `

    ${statCard("📥", total, "Contacts enregistrés")}

    ${statCard("🆕", nouveaux, "Nouveaux")}

    ${statCard("📂", dossiers, "Dossiers en cours")}

    ${statCard("✅", inscrits, "Inscrits")}

  `;


  renderDomainStats();
  renderStatusStats();

}


function statCard(icon, number, label) {

  return `

    <div class="stat-card">

      <div style="font-size:25px">
        ${icon}
      </div>

      <div class="stat-number">
        ${number}
      </div>

      <div class="stat-label">
        ${label}
      </div>

    </div>

  `;

}


function renderDomainStats() {

  const box =
    document.getElementById("domainStats");

  if (!box) return;

  box.innerHTML = "";

  const total =
    Math.max(demandes.length, 1);


  Object.keys(COLORS).forEach(domain => {

    const count =
      demandes.filter(contact =>
        clean(contact.Domaine) === domain
      ).length;

    const percent =
      Math.round(
        (count / total) * 100
      );


    box.innerHTML += `

      <div class="stat-line">

        <div class="stat-line-top">
          <span>${escapeHtml(domain)}</span>
          <strong>${count}</strong>
        </div>

        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            style="
              width:${percent}%;
              background:${COLORS[domain]}
            "
          ></div>
        </div>

      </div>

    `;

  });

}


function renderStatusStats() {

  const box =
    document.getElementById("statusStats");

  if (!box) return;

  box.innerHTML = "";

  const statuses = [
    "Nouveau",
    "À rappeler",
    "En attente",
    "Dossier en cours",
    "Inscrit",
    "Abandon",
    "Formation réalisée"
  ];

  const total =
    Math.max(demandes.length, 1);


  statuses.forEach(status => {

    const count =
      countStatus(status);

    const percent =
      Math.round(
        (count / total) * 100
      );


    box.innerHTML += `

      <div class="stat-line">

        <div class="stat-line-top">
          <span>${escapeHtml(status)}</span>
          <strong>${count}</strong>
        </div>

        <div class="stat-bar">
          <div
            class="stat-bar-fill"
            style="
              width:${percent}%;
              background:#42a5b3
            "
          ></div>
        </div>

      </div>

    `;

  });

}


function countStatus(status) {

  return demandes.filter(contact =>
    clean(contact.Statut) === status
  ).length;

}


/* =========================================================
   PARAMETRAGE
========================================================= */

function openSettings() {

  updateSettings();

  showPage("settings");

}


function updateSettings() {

  const activeFormations =
    formations.filter(f =>
      clean(f.Active).toLowerCase() !== "non"
    ).length;

  setText(
    "settingsFormationCount",
    activeFormations
  );

  setText(
    "settingsSessionCount",
    sessions.length
  );

}


/* =========================================================
   UTILITAIRES
========================================================= */

function fullName(contact) {

  const name = [
    clean(contact.Prenom),
    clean(contact.Nom)
  ]
    .filter(Boolean)
    .join(" ");

  return name || "Contact sans nom";

}


function formatDate(timestamp) {

  const value = Number(timestamp);

  if (!value) return "";

  const date =
    new Date(value * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "fr-FR"
  );

}


function dateInputValue(timestamp) {

  const value = Number(timestamp);

  if (!value) return "";

  const date =
    new Date(value * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function startOfToday() {

  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

}


function infoRow(label, value) {

  return `

    <div class="info-row">

      <div class="info-label">
        ${escapeHtml(label)}
      </div>

      <div class="info-value">
        ${escapeHtml(value || "—")}
      </div>

    </div>

  `;

}


function statusBadge(status) {

  const value =
    clean(status) || "Nouveau";

  let cls = "status-nouveau";

  if (value === "À rappeler") {
    cls = "status-rappeler";
  }

  if (value === "En attente") {
    cls = "status-attente";
  }

  if (value === "Dossier en cours") {
    cls = "status-dossier";
  }

  if (
    value === "Inscrit" ||
    value === "Formation réalisée"
  ) {
    cls = "status-inscrit";
  }

  if (value === "Abandon") {
    cls = "status-abandon";
  }


  return `
    <span class="status-pill ${cls}">
      ${escapeHtml(value)}
    </span>
  `;

}


function statusOptions(selected) {

  return simpleOptions(
    [
      "Nouveau",
      "À rappeler",
      "En attente",
      "Dossier en cours",
      "Inscrit",
      "Abandon",
      "Formation réalisée"
    ],
    selected
  );

}


function simpleOptions(values, selected) {

  return values.map(item => {

    const isSelected =
      clean(item) === clean(selected)
        ? " selected"
        : "";

    return `
      <option${isSelected}>
        ${escapeHtml(item)}
      </option>
    `;

  }).join("");

}


function escapeHtml(text) {

  return clean(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(text) {
  return escapeHtml(text);
}


/* =========================================================
   EVENEMENTS
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const bind = (id, fn) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.onclick = fn;
      }

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


    bind(
      "saveDemand",
      saveDemand
    );


    const search =
      document.getElementById(
        "contactSearch"
      );

    if (search) {

      search.addEventListener(
        "input",
        renderContacts
      );

    }


    document
      .querySelectorAll(".filter")
      .forEach(button => {

        button.onclick = () => {

          currentStatusFilter =
            clean(button.dataset.status);

          document
            .querySelectorAll(".filter")
            .forEach(b =>
              b.classList.remove("active")
            );

          button.classList.add("active");

          renderContacts();

        };

      });


    renderContact();
    renderDomains();
    renderTypes();

    loadAllData();

  }
);
