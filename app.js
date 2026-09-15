
const state={step:1,contact:null,domain:null,formation:null,session:null,type:null};
const colors={
 "Sécurité au travail":"#8064a2",
 "Agriculture":"#f4a142",
 "Paysages / Environnement":"#70ad47",
 "Agroalimentaire":"#ffc000",
 "Management / Communication":"#42a5b3"
};
let formations=[],sessions=[];

grist.ready({requiredAccess:'full'});

function rows(table){
  if(!table) return [];
  if(Array.isArray(table)) return table;
  const ids=table.id||[];
  return ids.map((id,i)=>{
    const r={id};
    Object.keys(table).forEach(k=>{if(k!=="id" && Array.isArray(table[k])) r[k]=table[k][i]});
    return r;
  });
}
async function load(){
  try{
    formations=rows(await grist.docApi.fetchTable("FORMATIONS"));
    sessions=rows(await grist.docApi.fetchTable("SESSIONS"));
  }catch(e){
    showMsg("Le widget attend les tables FORMATIONS et SESSIONS. Importe d'abord le kit Grist.",false);
  }
  renderContact(); renderDomains(); renderTypes();
}
function button(text, cls="", onClick, color){
  const b=document.createElement("button"); b.type="button"; b.className="choice "+cls; b.innerHTML=color?`<span class="dot" style="background:${color}"></span>${text}`:text;
  b.onclick=()=>{onClick();};
  return b;
}
function selectOne(container, value, setter){
  [...container.children].forEach(x=>x.classList.remove("selected"));
  const target=[...container.children].find(x=>x.dataset.value===value); if(target)target.classList.add("selected");
  setter(value); container.closest(".step").querySelector(".next").disabled=false;
}
function renderContact(){
  const c=document.getElementById("contactChoices"); c.innerHTML="";
  ["Bruno","Claire","Stéphanie","Cécile","Hélène","Séverine","Laurène","Autre"].forEach(v=>{
    const b=button("👤 "+v,"",()=>selectOne(c,v,x=>state.contact=x)); b.dataset.value=v;c.appendChild(b);
  });
}
function renderDomains(){
  const c=document.getElementById("domainChoices");c.innerHTML="";
  Object.keys(colors).forEach(v=>{
    const b=button(v,"domain",()=>{selectOne(c,v,x=>state.domain=x);state.formation=null;state.session=null;renderFormations();},colors[v]);
    b.dataset.value=v;c.appendChild(b);
  });
}
function renderFormations(){
  const c=document.getElementById("formationChoices");c.innerHTML="";
  const list=formations.filter(f=>f.Domaine===state.domain && String(f.Active||"Oui")!=="Non");
  list.forEach(f=>{
    const label=f.Formation||"Formation";
    const b=button(label,"",()=>{selectOne(c,label,x=>state.formation=x);state.session=null;renderSessions();});
    b.dataset.value=label;c.appendChild(b);
  });
  if(!list.length)c.innerHTML="<p>Aucune formation trouvée pour cette catégorie.</p>";
}
function renderSessions(){
  const c=document.getElementById("sessionChoices");c.innerHTML="";
  const list=sessions.filter(s=>s.Formation===state.formation);
  list.forEach(s=>{
    const label=s.Libelle_session||s.Libellé_session||"Session";
    const b=button("📅 "+label,"",()=>{selectOne(c,label,x=>state.session=x);document.getElementById("otherDateWrap").classList.toggle("hidden",!label.toLowerCase().includes("définir"));});
    b.dataset.value=label;c.appendChild(b);
  });
  if(!list.length){
    const label="Date à définir / autre demande";
    const b=button("📅 "+label,"",()=>{selectOne(c,label,x=>state.session=x);document.getElementById("otherDateWrap").classList.remove("hidden");});
    b.dataset.value=label;c.appendChild(b);
  }
}
function renderTypes(){
  const c=document.getElementById("typeChoices");c.innerHTML="";
  [["👤 Particulier","Particulier"],["🏢 Entreprise","Entreprise"]].forEach(([lab,v])=>{
    const b=button(lab,"",()=>{selectOne(c,v,x=>state.type=x);document.querySelectorAll(".company").forEach(e=>e.classList.toggle("hidden",v!=="Entreprise"));});
    b.dataset.value=v;c.appendChild(b);
  });
}
function goto(n){
  state.step=n;document.querySelectorAll(".step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)===n));
  document.getElementById("progressBar").style.width=(n/6*100)+"%";
  if(n===3)renderFormations(); if(n===4)renderSessions(); if(n===6)renderSummary();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".next").forEach(b=>b.onclick=()=>goto(state.step+1));
document.querySelectorAll(".back").forEach(b=>b.onclick=()=>goto(state.step-1));

function val(id){return document.getElementById(id)?.value?.trim()||""}
function renderSummary(){
  document.getElementById("summary").innerHTML=
    `<b>${state.contact||"—"}</b> a pris le contact · <b>${state.domain||"—"}</b><br>`+
    `<b>${state.formation||"—"}</b> · 📅 ${state.session||"—"}<br>`+
    `${val("prenom")} <b>${val("nom")||"Nom à compléter"}</b>${val("entreprise")?" · "+val("entreprise"):""}`;
}
function dateValue(id){
  const v=val(id); return v ? Math.floor(new Date(v+"T00:00:00").getTime()/1000) : null;
}
function showMsg(t,ok=true){const m=document.getElementById("message");m.textContent=t;m.className=ok?"ok":"err";}
document.getElementById("save").onclick=async()=>{
  if(!val("nom")){showMsg("Le nom est obligatoire.",false);goto(5);return}
  const now=new Date();
  const numero=`FC-${now.getFullYear()}-${String(Date.now()).slice(-6)}`;
  const fields={
    Numero_dossier:numero,
    Date_premier_contact:Math.floor(now.getTime()/1000),
    Nom:val("nom"), Prenom:val("prenom"), Type_contact:state.type||"",
    Entreprise_organisme:val("entreprise"), Entreprise_pour_salaries:val("pourSalaries"),
    Adresse:val("adresse"), Code_postal:val("cp"), Ville:val("ville"), Email:val("email"),
    Telephone:val("telephone"), Date_naissance:dateValue("naissance"),
    Profil_situation:val("profil"), Premier_contact_par:state.contact||"", Charge_ingenierie:val("charge"),
    Domaine:state.domain||"", Formation:state.formation||"", Besoin_hors_catalogue:val("besoin"),
    Financement:val("financement"), Session_souhaitee:state.session||"",
    Date_souhaitee_libre:dateValue("otherDate"), Date_prochaine_relance:dateValue("relance"),
    Statut:val("statut"), Inscription:val("inscription"),
    Derniere_action:"Création de la demande", Commentaires:val("commentaires")
  };
  Object.keys(fields).forEach(k=>fields[k]===null && delete fields[k]);
  try{
    await grist.docApi.applyUserActions([["AddRecord","DEMANDES",null,fields]]);
    showMsg("✓ Demande enregistrée dans Grist.");
    document.getElementById("save").disabled=true;
  }catch(e){showMsg("Impossible d'enregistrer : "+(e.message||e),false)}
};
load();
