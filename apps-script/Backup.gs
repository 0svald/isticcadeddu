/**
 * Backup.gs — Copia automatica del foglio dati ogni 6 ore.
 * Le copie vanno nella cartella Drive "GAS Backup" (creata al primo backup);
 * quelle più vecchie di 7 giorni vengono spostate nel cestino.
 *
 * Installazione: eseguire UNA VOLTA installaTriggerBackup() dall'editor.
 */

var BACKUP_CARTELLA_ = 'GAS Backup';
var BACKUP_GIORNI_ = 7;

/** Cartella dei backup (la crea se manca). L'ID si salva nelle proprietà. */
function cartellaBackup_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('BACKUP_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(BACKUP_CARTELLA_);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_CARTELLA_);
  props.setProperty('BACKUP_FOLDER_ID', f.getId());
  return f;
}

/** Crea una copia del foglio e rimuove le copie più vecchie di 7 giorni. */
function backupFoglio() {
  const ss = ss_();
  const cartella = cartellaBackup_();
  const stamp = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd-MM-yyyy HH.mm');
  DriveApp.getFileById(ss.getId()).makeCopy('Backup GAS ' + stamp, cartella);

  const limite = new Date(Date.now() - BACKUP_GIORNI_ * 24 * 3600 * 1000);
  const files = cartella.getFiles();
  let rimossi = 0;
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().indexOf('Backup GAS ') === 0 && f.getDateCreated() < limite) { f.setTrashed(true); rimossi++; }
  }
  log_('sistema', 'backup', 'Backup GAS ' + stamp + (rimossi ? (' · rimossi ' + rimossi + ' vecchi') : ''));
  return 'OK';
}

/** Installa il trigger ogni 6 ore (ed esegue subito un primo backup). */
function installaTriggerBackup() {
  rimuoviTriggerBackup();
  ScriptApp.newTrigger('backupFoglio').timeBased().everyHours(6).create();
  backupFoglio();
  return 'Backup attivato ogni 6 ore; primo backup eseguito.';
}
function rimuoviTriggerBackup() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'backupFoglio').forEach(t => ScriptApp.deleteTrigger(t));
}
