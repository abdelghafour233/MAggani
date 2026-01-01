
import React, { useState, useCallback } from 'react';
import { Upload, FileImage, Download, X, Settings, RefreshCw, Zap, CheckCircle2, ChevronDown } from 'lucide-react';
import { FileRecord, ImageFormat } from './types';
import { convertImage, fileToBase64 } from './services/imageService';
import { analyzeImage } from './services/geminiService';

export default function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    // Fix: Explicitly type 'file' as 'File' to resolve the 'unknown' type inference error.
    const newFiles: FileRecord[] = Array.from(uploadedFiles).map((file: File) => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      previewUrl: URL.createObjectURL(file),
      targetFormat: 'jpeg',
      status: 'idle'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
  };

  const updateTargetFormat = (id: string, format: ImageFormat) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, targetFormat: format } : f));
  };

  const processFile = async (id: string) => {
    const fileRecord = files.find(f => f.id === id);
    if (!fileRecord) return;

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing' } : f));

    try {
      // 1. Convert Image
      const blob = await convertImage(fileRecord.file, fileRecord.targetFormat);
      
      // 2. AI Analysis (Simultaneous/Optional)
      const base64 = await fileToBase64(fileRecord.file);
      const aiData = await analyzeImage(base64, fileRecord.file.type);

      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'completed', 
        convertedBlob: blob,
        aiDescription: aiData?.description,
        suggestedName: aiData?.suggestedName
      } : f));
    } catch (error) {
      console.error(error);
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error' } : f));
    }
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    const idleFiles = files.filter(f => f.status === 'idle');
    for (const f of idleFiles) {
      await processFile(f.id);
    }
    setIsProcessingAll(false);
  };

  const downloadFile = (fileRecord: FileRecord) => {
    if (!fileRecord.convertedBlob) return;
    const url = URL.createObjectURL(fileRecord.convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    // Use AI suggested name if available, otherwise original
    const name = fileRecord.suggestedName 
      ? `${fileRecord.suggestedName}.${fileRecord.targetFormat}`
      : `converted_${fileRecord.file.name.split('.')[0]}.${fileRecord.targetFormat}`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <RefreshCw size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">CloudConvert <span className="text-blue-600">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-blue-600 transition-colors">التحويلات</a>
            <a href="#" className="hover:text-blue-600 transition-colors">الأسعار</a>
            <a href="#" className="hover:text-blue-600 transition-colors">الأدوات</a>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors">تسجيل الدخول</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
            محول الصور الذكي والمجاني
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            قم بتحويل صورك إلى أي صيغة مع تحسين تلقائي بواسطة الذكاء الاصطناعي Gemini للحصول على أفضل جودة وأسماء ملفات متوافقة مع محركات البحث.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-8">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl py-12 px-6 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group relative">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">اختر الملفات أو اسحبها هنا</h3>
            <p className="text-slate-500">PNG, JPG, WebP حتي 10 ميجا بايت</p>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="mt-8 space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700">الملفات المختارة ({files.length})</h4>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setFiles([])}
                    className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <X size={16} /> مسح الكل
                  </button>
                </div>
              </div>

              {files.map((fileRecord) => (
                <div key={fileRecord.id} className="group relative bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                    <img src={fileRecord.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate mb-1">{fileRecord.file.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{(fileRecord.file.size / 1024).toFixed(1)} KB</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="uppercase text-blue-600 font-semibold">{fileRecord.file.type.split('/')[1]}</span>
                    </div>
                    {fileRecord.aiDescription && (
                      <div className="mt-2 flex items-center gap-2 bg-blue-100/50 text-blue-700 px-2 py-1 rounded text-[10px] w-fit">
                        <Zap size={10} className="fill-blue-700" />
                        <span>{fileRecord.aiDescription}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>إلى</span>
                      <div className="relative">
                        <select 
                          value={fileRecord.targetFormat}
                          onChange={(e) => updateTargetFormat(fileRecord.id, e.target.value as ImageFormat)}
                          className="appearance-none bg-white border border-slate-300 rounded-md px-3 py-1.5 pl-8 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-bold"
                        >
                          <option value="jpeg">JPG</option>
                          <option value="png">PNG</option>
                          <option value="webp">WebP</option>
                        </select>
                        <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileRecord.status === 'idle' && (
                        <button 
                          onClick={() => processFile(fileRecord.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                          تحويل
                        </button>
                      )}
                      {fileRecord.status === 'processing' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-200 rounded-lg text-slate-600 text-sm animate-pulse">
                          <RefreshCw size={16} className="animate-spin" />
                          جاري التحويل...
                        </div>
                      )}
                      {fileRecord.status === 'completed' && (
                        <button 
                          onClick={() => downloadFile(fileRecord)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                          <Download size={16} />
                          تحميل
                        </button>
                      )}
                      {fileRecord.status === 'error' && (
                        <span className="text-red-500 text-sm">خطأ!</span>
                      )}
                      <button 
                        onClick={() => removeFile(fileRecord.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={processAll}
                  disabled={isProcessingAll || files.filter(f => f.status === 'idle').length === 0}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                    isProcessingAll || files.filter(f => f.status === 'idle').length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 shadow-blue-200'
                  }`}
                >
                  {isProcessingAll ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                  تحويل الكل
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">سرعة فائقة</h3>
            <p className="text-slate-600 leading-relaxed">تتم عملية التحويل مباشرة في متصفحك، مما يعني سرعة قصوى وحماية لخصوصيتك.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">جودة مضمونة</h3>
            <p className="text-slate-600 leading-relaxed">نستخدم أفضل خوارزميات الضغط والتحويل لضمان عدم فقدان أي تفاصيل من صورك.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <Settings size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">تحسين AI</h3>
            <p className="text-slate-600 leading-relaxed">يقوم الذكاء الاصطناعي بوصف صورك واقتراح أفضل الأسماء المتوافقة مع الـ SEO تلقائياً.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-600 p-1.5 rounded text-white">
                <RefreshCw size={18} />
              </div>
              <span className="text-lg font-bold">CloudConvert AI</span>
            </div>
            <p className="text-slate-500 max-w-sm">
              الأداة الأكثر ثقة لتحويل الصور عبر الإنترنت. نحن ندعم أكثر من 200 صيغة ونستخدم الذكاء الاصطناعي لتبسيط عملك.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">المنتج</h4>
            <ul className="space-y-2 text-slate-500">
              <li><a href="#" className="hover:text-blue-600">محول الصور</a></li>
              <li><a href="#" className="hover:text-blue-600">محول الفيديو</a></li>
              <li><a href="#" className="hover:text-blue-600">ضغط الملفات</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">المساعدة</h4>
            <ul className="space-y-2 text-slate-500">
              <li><a href="#" className="hover:text-blue-600">مركز المساعدة</a></li>
              <li><a href="#" className="hover:text-blue-600">سياسة الخصوصية</a></li>
              <li><a href="#" className="hover:text-blue-600">تواصل معنا</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
          © 2024 CloudConvert AI. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
