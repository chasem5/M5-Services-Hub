import { useState } from "react";
import { Upload, FileText, Image, File, Download, MoreHorizontal, Plus, Folder, Search } from "lucide-react";

const RED = "#BE1916";

type FileItem = {
  id: number; name: string; type: "pdf" | "image" | "doc" | "xls" | "other";
  size: string; uploadedBy: string; uploadedByPhoto: string; date: string; group: "deal" | "company"; deal?: string;
};

const files: FileItem[] = [
  { id: 1, name: "C&W_Suite200_Proposal_v2.pdf", type: "pdf", size: "2.4 MB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Mar 22, 2025", group: "deal", deal: "Suite 200 Vacant Prep" },
  { id: 2, name: "4th_Floor_TI_Phase2_Contract_Signed.pdf", type: "pdf", size: "1.1 MB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Mar 1, 2025", group: "deal", deal: "4th Floor TI – Phase 2" },
  { id: 3, name: "4th_Floor_TI_Phase2_Estimate_Final.pdf", type: "pdf", size: "895 KB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Feb 27, 2025", group: "deal", deal: "4th Floor TI – Phase 2" },
  { id: 4, name: "Embarcadero_Tower3_SiteWalk_Photos.zip", type: "other", size: "38.2 MB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Mar 21, 2025", group: "company" },
  { id: 5, name: "CW_Account_Brief_2025.pdf", type: "pdf", size: "442 KB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Jan 15, 2025", group: "company" },
  { id: 6, name: "Bay_Area_Portfolio_Map.png", type: "image", size: "1.8 MB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Dec 10, 2024", group: "company" },
  { id: 7, name: "Janitorial_Agreement_2024.pdf", type: "pdf", size: "318 KB", uploadedBy: "Chase Murray", uploadedByPhoto: "https://randomuser.me/api/portraits/men/1.jpg", date: "Jan 3, 2024", group: "company" },
];

const iconMap: Record<FileItem["type"], React.ReactNode> = {
  pdf: <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>,
  image: <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Image className="w-4 h-4 text-blue-500" /></div>,
  doc: <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><FileText className="w-4 h-4 text-indigo-500" /></div>,
  xls: <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><FileText className="w-4 h-4 text-emerald-500" /></div>,
  other: <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><File className="w-4 h-4 text-gray-500" /></div>,
};

function Photo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!failed) return <img src={src} alt={name} onError={() => setFailed(true)} className="w-5 h-5 rounded-full object-cover" />;
  return <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white">{name[0]}</div>;
}

function FileRow({ file }: { file: FileItem }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
      {iconMap[file.type]}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
          <span>{file.size}</span>
          <span>·</span>
          <Photo src={file.uploadedByPhoto} name={file.uploadedBy} />
          <span>{file.uploadedBy}</span>
          <span>·</span>
          <span>{file.date}</span>
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button className="p-1.5 rounded-lg hover:bg-gray-200"><Download className="w-3.5 h-3.5 text-gray-500" /></button>
        <button className="p-1.5 rounded-lg hover:bg-gray-200"><MoreHorizontal className="w-3.5 h-3.5 text-gray-500" /></button>
      </div>
    </div>
  );
}

export function FilesTab() {
  const [dragging, setDragging] = useState(false);
  const deals = [...new Set(files.filter(f => f.deal).map(f => f.deal!))];
  const companyFiles = files.filter(f => f.group === "company");

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">C&W</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-['Archivo_Black',sans-serif]">Cushman &amp; Wakefield</h1>
            <p className="text-xs text-gray-500">Commercial Real Estate · Tier A</p>
          </div>
        </div>
        <div className="flex gap-0 mt-3 border-b border-gray-200 -mb-4">
          {["Overview","Organization","Revenue","History","Files","Intelligence"].map(t => (
            <div key={t} className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "Files" ? "" : "border-transparent text-gray-400"}`} style={t === "Files" ? { borderColor: RED, color: RED, borderBottomWidth: 2 } : {}}>{t}</div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Upload zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={() => setDragging(false)}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Drop files here or <span style={{ color: RED }} className="cursor-pointer hover:underline">browse</span></p>
          <p className="text-xs text-gray-400 mt-1">PDF, images, documents up to 50MB each</p>
        </div>

        {/* Search + upload button */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input placeholder="Search files…" className="text-sm flex-1 outline-none bg-transparent text-gray-700 placeholder:text-gray-400" />
          </div>
          <button className="text-xs px-4 py-2 rounded-lg text-white font-medium flex items-center gap-1.5" style={{ backgroundColor: RED }}>
            <Plus className="w-3 h-3" /> Upload
          </button>
        </div>

        {/* Deal-grouped files */}
        {deals.map(deal => (
          <div key={deal} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <Folder className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-gray-700">{deal}</span>
              <span className="text-[10px] text-gray-400 ml-1">{files.filter(f => f.deal === deal).length} files</span>
            </div>
            <div className="divide-y divide-gray-50">
              {files.filter(f => f.deal === deal).map(f => <FileRow key={f.id} file={f} />)}
            </div>
          </div>
        ))}

        {/* Company files */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <Folder className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">Company Files</span>
            <span className="text-[10px] text-gray-400 ml-1">{companyFiles.length} files</span>
          </div>
          <div className="divide-y divide-gray-50">
            {companyFiles.map(f => <FileRow key={f.id} file={f} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
