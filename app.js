const STORAGE_KEYS = {
  investimenti: "officina_investimenti_v1",
  trades: "officina_trades_v1",
  promemoria: "officina_promemoria_v1",
  syncKey: "officina_sync_key_v1",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const loadData = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const DELETED_KEYS = {
  investimenti: "officina_deleted_investimenti_v1",
  trades: "officina_deleted_trades_v1",
  promemoria: "officina_deleted_promemoria_v1",
};

const normalizeItem = (item) => ({
  ...item,
  updatedAt: item.updatedAt || 0,
});

const applyTombstones = (items, tombstones) => {
  const deletedMap = new Map(tombstones.map((t) => [t.id, t.deletedAt || 0]));
  return items.filter((item) => {
    const deletedAt = deletedMap.get(item.id);
    return !deletedAt || (item.updatedAt || 0) > deletedAt;
  });
};

const mergeById = (localItems, cloudItems, tombstones = null) => {
  const map = new Map();
  localItems.forEach((item) => {
    map.set(item.id, normalizeItem(item));
  });
  cloudItems.forEach((item) => {
    const normalized = normalizeItem(item);
    const existing = map.get(normalized.id);
    if (!existing || normalized.updatedAt > existing.updatedAt) {
      map.set(normalized.id, normalized);
    }
  });
  const merged = Array.from(map.values());
  return tombstones ? applyTombstones(merged, tombstones) : merged;
};

const state = {
  investimenti: loadData(STORAGE_KEYS.investimenti),
  trades: loadData(STORAGE_KEYS.trades),
  promemoria: loadData(STORAGE_KEYS.promemoria),
};

const deletedState = {
  investimenti: loadData(DELETED_KEYS.investimenti),
  trades: loadData(DELETED_KEYS.trades),
  promemoria: loadData(DELETED_KEYS.promemoria),
};

const saveDeleted = () => {
  saveData(DELETED_KEYS.investimenti, deletedState.investimenti);
  saveData(DELETED_KEYS.trades, deletedState.trades);
  saveData(DELETED_KEYS.promemoria, deletedState.promemoria);
};

let lastCloudUpdatedAt = 0;

const getLocalUpdatedAt = () => {
  const allItems = [...state.investimenti, ...state.trades, ...state.promemoria];
  return allItems.reduce((acc, item) => Math.max(acc, item.updatedAt || 0), 0);
};

const elementi = {
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".panel"),
  formInvestimento: document.getElementById("form-investimento"),
  listaInvestimenti: document.getElementById("lista-investimenti"),
  formTrade: document.getElementById("form-trade"),
  listaTrades: document.getElementById("lista-trades"),
  formPromemoria: document.getElementById("form-promemoria"),
  listaPromemoria: document.getElementById("lista-promemoria"),
  totaleInvestito: document.getElementById("totale-investito"),
  totaleAcquisti: document.getElementById("totale-acquisti"),
  totaleVendite: document.getElementById("totale-vendite"),
  totaleProfitto: document.getElementById("totale-profitto"),
  totaleCostiPezzi: document.getElementById("totale-costi-pezzi"),
  totaleRicaviCliente: document.getElementById("totale-ricavi-cliente"),
  totaleDaIncassare: document.getElementById("totale-da-incassare"),
  totaleMargine: document.getElementById("totale-margine"),
  filterNonPagati: document.getElementById("filter-non-pagati"),
  syncStatus: document.getElementById("sync-status"),
  promemoriaSubmit: document.getElementById("promemoria-submit"),
  promemoriaCancel: document.getElementById("promemoria-cancel"),
};

const promemoriaFormDefaults = {
  statoCliente: "in-lavorazione",
  pagato: "no",
};

const setPromemoriaEditMode = (item) => {
  if (item) {
    elementi.formPromemoria.dataset.editId = item.id;
    elementi.formPromemoria.data.value = item.data;
    elementi.formPromemoria.dispositivo.value = item.dispositivo;
    elementi.formPromemoria.intervento.value = item.intervento;
    elementi.formPromemoria.nome.value = item.nome;
    elementi.formPromemoria.cognome.value = item.cognome;
    elementi.formPromemoria.costoPezzi.value = item.costoPezzi ?? 0;
    elementi.formPromemoria.prezzoCliente.value = item.prezzoCliente ?? 0;
    elementi.formPromemoria.statoCliente.value = item.statoCliente || "in-lavorazione";
    elementi.formPromemoria.pagato.value = item.pagato ? "si" : "no";
    elementi.formPromemoria.note.value = item.note || "";
    elementi.promemoriaSubmit.textContent = "Salva modifiche";
    elementi.promemoriaCancel.style.display = "inline-flex";
    return;
  }

  delete elementi.formPromemoria.dataset.editId;
  elementi.formPromemoria.reset();
  elementi.formPromemoria.statoCliente.value = promemoriaFormDefaults.statoCliente;
  elementi.formPromemoria.pagato.value = promemoriaFormDefaults.pagato;
  elementi.promemoriaSubmit.textContent = "Aggiungi promemoria";
  elementi.promemoriaCancel.style.display = "none";
};

const getSyncKey = () => {
  const key = "principale";
  localStorage.setItem(STORAGE_KEYS.syncKey, key);
  return key;
};

const setSyncStatus = (message) => {
  elementi.syncStatus.textContent = message;
  if (message.toLowerCase().includes("errore")) {
    elementi.syncStatus.classList.add("is-error");
  } else {
    elementi.syncStatus.classList.remove("is-error");
  }
};

const calcolaTotali = () => {
  const investito = state.investimenti.reduce((acc, t) => acc + t.importo, 0);
  const acquisti = state.trades
    .filter((t) => t.tipo === "acquisto")
    .reduce((acc, t) => acc + t.importo, 0);
  const vendite = state.trades
    .filter((t) => t.tipo === "vendita")
    .reduce((acc, t) => acc + t.importo, 0);
  const profitto = vendite - acquisti;
  const costiPezzi = state.promemoria.reduce(
    (acc, p) => acc + (p.costoPezzi || 0),
    0
  );
  const ricaviCliente = state.promemoria.reduce(
    (acc, p) => acc + (p.prezzoCliente || 0),
    0
  );
  const daIncassare = state.promemoria
    .filter((p) => !p.pagato)
    .reduce((acc, p) => acc + (p.prezzoCliente || 0), 0);
  const margine = ricaviCliente - costiPezzi;

  elementi.totaleInvestito.textContent = formatCurrency(investito);
  elementi.totaleAcquisti.textContent = formatCurrency(acquisti);
  elementi.totaleVendite.textContent = formatCurrency(vendite);
  elementi.totaleProfitto.textContent = formatCurrency(profitto);
  elementi.totaleCostiPezzi.textContent = formatCurrency(costiPezzi);
  elementi.totaleRicaviCliente.textContent = formatCurrency(ricaviCliente);
  elementi.totaleDaIncassare.textContent = formatCurrency(daIncassare);
  elementi.totaleMargine.textContent = formatCurrency(margine);
};

const renderInvestimenti = () => {
  elementi.listaInvestimenti.innerHTML = "";

  if (state.investimenti.length === 0) {
    elementi.listaInvestimenti.innerHTML =
      '<p class="item-meta">Nessun investimento registrato.</p>';
    return;
  }

  state.investimenti
    .slice()
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .forEach((t) => {
      const item = document.createElement("div");
      item.className = "item";

      item.innerHTML = `
        <div class="item-header">
          <div>
            <div class="item-title">${t.titolo}</div>
            <div class="item-meta">${t.data} · ${t.note || "Nessuna nota"}</div>
          </div>
          <div class="badge">investimento</div>
        </div>
        <div class="item-header">
          <div class="item-meta">Importo</div>
          <strong>${formatCurrency(t.importo)}</strong>
        </div>
        <button class="ghost" data-remove="${t.id}">Rimuovi</button>
      `;

      item.querySelector("button").addEventListener("click", () => {
        state.investimenti = state.investimenti.filter((x) => x.id !== t.id);
        deletedState.investimenti.push({ id: t.id, deletedAt: Date.now() });
        saveData(STORAGE_KEYS.investimenti, state.investimenti);
        saveDeleted();
        aggiornaUI();
        scheduleUpload();
      });

      elementi.listaInvestimenti.appendChild(item);
    });
};

const renderTrades = () => {
  elementi.listaTrades.innerHTML = "";

  if (state.trades.length === 0) {
    elementi.listaTrades.innerHTML =
      '<p class="item-meta">Nessun acquisto o vendita registrata.</p>';
    return;
  }

  state.trades
    .slice()
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .forEach((t) => {
      const item = document.createElement("div");
      item.className = "item";
      const badgeClass = t.tipo === "vendita" ? "success" : "danger";
      const segno = t.tipo === "vendita" ? "+" : "-";

      item.innerHTML = `
        <div class="item-header">
          <div>
            <div class="item-title">${t.titolo}</div>
            <div class="item-meta">${t.data} · ${t.note || "Nessuna nota"}</div>
          </div>
          <div class="badge ${badgeClass}">${t.tipo}</div>
        </div>
        <div class="item-header">
          <div class="item-meta">Importo</div>
          <strong>${segno} ${formatCurrency(t.importo)}</strong>
        </div>
        <button class="ghost" data-remove="${t.id}">Rimuovi</button>
      `;

      item.querySelector("button").addEventListener("click", () => {
        state.trades = state.trades.filter((x) => x.id !== t.id);
        deletedState.trades.push({ id: t.id, deletedAt: Date.now() });
        saveData(STORAGE_KEYS.trades, state.trades);
        saveDeleted();
        aggiornaUI();
        scheduleUpload();
      });

      elementi.listaTrades.appendChild(item);
    });
};

const renderPromemoria = () => {
  elementi.listaPromemoria.innerHTML = "";
  const mostraSoloNonPagati = elementi.filterNonPagati?.checked;
  const promemoriaFiltrati = mostraSoloNonPagati
    ? state.promemoria.filter((p) => !p.pagato)
    : state.promemoria;

  if (promemoriaFiltrati.length === 0) {
    elementi.listaPromemoria.innerHTML = mostraSoloNonPagati
      ? '<p class="item-meta">Nessun promemoria da incassare.</p>'
      : '<p class="item-meta">Nessun promemoria attivo.</p>';
    return;
  }

  promemoriaFiltrati
    .slice()
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .forEach((p) => {
      const item = document.createElement("div");
      const isGood = p.completato && p.pagato;
      const isWarning = (p.completato && !p.pagato) || (!p.completato && p.pagato);
      const statusClass = isGood ? " is-good" : isWarning ? " is-warning" : " is-open";
      item.className = `item${statusClass}`;
      const statoClasse = p.completato ? "success" : "danger";
      const pagatoClasse = p.pagato ? "success" : "warning";
      item.innerHTML = `
        <div class="item-header">
          <div>
            <div class="item-title">${p.dispositivo}</div>
            <div class="item-meta">${p.intervento} · ${p.data}</div>
            <div class="item-meta">${p.nome} ${p.cognome}</div>
          </div>
          <div class="badge ${statoClasse}">${
            p.completato ? "fatto" : "aperto"
          }</div>
        </div>
        <div class="item-header">
          <div class="item-meta">Costo pezzi</div>
          <strong>${formatCurrency(p.costoPezzi || 0)}</strong>
        </div>
        <div class="item-header">
          <div class="item-meta">Prezzo cliente</div>
          <strong>${formatCurrency(p.prezzoCliente || 0)}</strong>
        </div>
        <div class="item-header">
          <div class="item-meta">Pagamento</div>
          <div class="badge ${pagatoClasse}">${p.pagato ? "pagato" : "da pagare"}</div>
        </div>
        <div class="item-header">
          <div class="item-meta">Stato cliente</div>
          <div class="badge">${p.statoCliente === "attesa-cliente" ? "attesa cliente" : "in lavorazione"}</div>
        </div>
        <div class="item-meta">${p.note || "Nessuna nota"}</div>
        <div class="item-header">
          <button class="primary" data-toggle="${p.id}">${
            p.completato ? "Riapri" : "Segna fatto"
          }</button>
          <button class="ghost" data-pay="${p.id}">${
            p.pagato ? "Segna non pagato" : "Segna pagato"
          }</button>
          <button class="ghost" data-edit="${p.id}">Modifica</button>
          <button class="ghost" data-remove="${p.id}">Rimuovi</button>
        </div>
      `;

      item.querySelector("[data-toggle]").addEventListener("click", () => {
        p.completato = !p.completato;
        p.updatedAt = Date.now();
        saveData(STORAGE_KEYS.promemoria, state.promemoria);
        aggiornaUI();
        scheduleUpload();
      });

      item.querySelector("[data-pay]").addEventListener("click", () => {
        p.pagato = !p.pagato;
        p.updatedAt = Date.now();
        saveData(STORAGE_KEYS.promemoria, state.promemoria);
        aggiornaUI();
        scheduleUpload();
      });

      item.querySelector("[data-edit]").addEventListener("click", () => {
        setPromemoriaEditMode(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      item.querySelector("[data-remove]").addEventListener("click", () => {
        state.promemoria = state.promemoria.filter((x) => x.id !== p.id);
        deletedState.promemoria.push({ id: p.id, deletedAt: Date.now() });
        saveData(STORAGE_KEYS.promemoria, state.promemoria);
        saveDeleted();
        aggiornaUI();
        scheduleUpload();
      });

      elementi.listaPromemoria.appendChild(item);
    });
};

const aggiornaUI = () => {
  calcolaTotali();
  renderInvestimenti();
  renderTrades();
  renderPromemoria();
};

const initTabs = () => {
  elementi.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      elementi.tabs.forEach((t) => t.classList.remove("is-active"));
      elementi.panels.forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.getElementById(tab.dataset.tab).classList.add("is-active");
    });
  });
};

elementi.formInvestimento.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const nuova = {
    id: crypto.randomUUID(),
    data: formData.get("data"),
    titolo: formData.get("titolo"),
    importo: Number(formData.get("importo")),
    note: formData.get("note"),
    updatedAt: Date.now(),
  };

  state.investimenti.push(nuova);
  saveData(STORAGE_KEYS.investimenti, state.investimenti);
  event.target.reset();
  aggiornaUI();
  scheduleUpload();
});

elementi.formTrade.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const nuova = {
    id: crypto.randomUUID(),
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    titolo: formData.get("titolo"),
    importo: Number(formData.get("importo")),
    note: formData.get("note"),
    updatedAt: Date.now(),
  };

  state.trades.push(nuova);
  saveData(STORAGE_KEYS.trades, state.trades);
  event.target.reset();
  aggiornaUI();
  scheduleUpload();
});

elementi.formPromemoria.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const editId = event.target.dataset.editId;
  const payload = {
    data: formData.get("data"),
    dispositivo: formData.get("dispositivo"),
    intervento: formData.get("intervento"),
    nome: formData.get("nome"),
    cognome: formData.get("cognome"),
    costoPezzi: Number(formData.get("costoPezzi")) || 0,
    prezzoCliente: Number(formData.get("prezzoCliente")) || 0,
    statoCliente: formData.get("statoCliente"),
    pagato: formData.get("pagato") === "si",
    note: formData.get("note"),
    updatedAt: Date.now(),
  };

  if (editId) {
    const target = state.promemoria.find((p) => p.id === editId);
    if (target) {
      Object.assign(target, payload);
    }
  } else {
    state.promemoria.push({
      id: crypto.randomUUID(),
      completato: false,
      ...payload,
    });
  }

  saveData(STORAGE_KEYS.promemoria, state.promemoria);
  setPromemoriaEditMode(null);
  aggiornaUI();
  scheduleUpload();
});

elementi.promemoriaCancel.addEventListener("click", () => {
  setPromemoriaEditMode(null);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if ("caches" in window) {
      const clearCaches = () => {
        caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("officina-cache-"))
              .map((key) => caches.delete(key))
          )
        );
      };
      clearCaches();
      setInterval(clearCaches, 1000);
    }
    navigator.serviceWorker.register("sw.js");
  });
}

const uploadToCloud = async () => {
  if (!navigator.onLine) {
    setSyncStatus("Senza rete");
    return;
  }
  if (lastCloudUpdatedAt > getLocalUpdatedAt()) {
    setSyncStatus("Cloud piu recente");
    await downloadFromCloud();
    return;
  }
  setSyncStatus("Caricamento in corso...");
  const payload = {
    investimenti: state.investimenti,
    trades: state.trades,
    promemoria: state.promemoria,
    updatedAt: Date.now(),
  };

  const response = await fetch(`/api/sync?key=${encodeURIComponent(getSyncKey())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (response.status === 409) {
    const conflict = await response.json();
    const cloudInvestimenti = conflict.data?.investimenti || [];
    const cloudTrades = conflict.data?.trades || [];
    const cloudPromemoria = conflict.data?.promemoria || [];
    lastCloudUpdatedAt = conflict.updatedAt || lastCloudUpdatedAt;
    state.investimenti = mergeById(state.investimenti, cloudInvestimenti);
    state.trades = mergeById(state.trades, cloudTrades);
    state.promemoria = mergeById(state.promemoria, cloudPromemoria);
    saveData(STORAGE_KEYS.investimenti, state.investimenti);
    saveData(STORAGE_KEYS.trades, state.trades);
    saveData(STORAGE_KEYS.promemoria, state.promemoria);
    aggiornaUI();
    setSyncStatus("Cloud piu recente");
    return;
  }
  if (!response.ok) {
    setSyncStatus("Errore upload");
    return;
  }
  lastCloudUpdatedAt = payload.updatedAt;
  setSyncStatus("Sincronizzato");
};

const downloadFromCloud = async () => {
  if (!navigator.onLine) {
    setSyncStatus("Senza rete");
    return;
  }
  setSyncStatus("Download in corso...");
  const response = await fetch(`/api/sync?key=${encodeURIComponent(getSyncKey())}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    setSyncStatus("Errore download");
    return;
  }
  const data = await response.json();
  if (!data || !data.data) {
    setSyncStatus("Nessun dato nel cloud");
    return;
  }
  lastCloudUpdatedAt = data.updatedAt || lastCloudUpdatedAt;
  const cloudInvestimenti = data.data.investimenti || [];
  const cloudTrades = data.data.trades || [];
  const cloudPromemoria = data.data.promemoria || [];
  state.investimenti = mergeById(state.investimenti, cloudInvestimenti);
  state.trades = mergeById(state.trades, cloudTrades);
  state.promemoria = mergeById(state.promemoria, cloudPromemoria);
  saveData(STORAGE_KEYS.investimenti, state.investimenti);
  saveData(STORAGE_KEYS.trades, state.trades);
  saveData(STORAGE_KEYS.promemoria, state.promemoria);
  aggiornaUI();
  setSyncStatus("Sincronizzato");
  scheduleUpload();
};

const scheduleUpload = (() => {
  let timerId;
  return () => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      uploadToCloud().catch(() => setSyncStatus("Errore upload"));
    }, 1200);
  };
})();

window.addEventListener("online", () => setSyncStatus("Connesso"));
window.addEventListener("offline", () => setSyncStatus("Senza rete"));

getSyncKey();
setPromemoriaEditMode(null);

elementi.filterNonPagati?.addEventListener("change", renderPromemoria);

initTabs();
aggiornaUI();
setSyncStatus(navigator.onLine ? "Connesso" : "Senza rete");

downloadFromCloud().catch(() => setSyncStatus("Errore download"));
setInterval(() => {
  uploadToCloud().catch(() => setSyncStatus("Errore upload"));
}, 60000);

setInterval(() => {
  downloadFromCloud().catch(() => setSyncStatus("Errore download"));
}, 10000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    downloadFromCloud().catch(() => setSyncStatus("Errore download"));
  }
});
