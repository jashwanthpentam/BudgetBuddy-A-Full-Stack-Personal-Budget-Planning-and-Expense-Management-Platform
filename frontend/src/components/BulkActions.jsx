export default function BulkActions({ count, allSelected, onToggleAll, onDelete, label = "records" }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"10px 0",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(127,145,168,.25)"}}>
      <label style={{display:"flex",alignItems:"center",gap:7,fontSize:13}}>
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} /> Select all
      </label>
      <span style={{fontSize:13,opacity:.75}}>{count} {label} selected</span>
      <button type="button" onClick={onDelete} disabled={!count} style={{marginLeft:"auto"}}>Delete selected</button>
    </div>
  );
}
