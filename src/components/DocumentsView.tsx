import React, { useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { db } from "../lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { ArrowLeft, FileText, Calendar, Layout } from "lucide-react";
import { motion } from "motion/react";

interface DocumentItem {
  id: string;
  formattedText: string;
  rawTranscript: string;
  subject: string;
  studentName: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

interface DocumentsViewProps {
  user: FirebaseUser | null;
  onBack: () => void;
}

export function DocumentsView({ user, onBack }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      try {
        const docsRef = collection(db, `users/${user.uid}/documents`);
        const q = query(docsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const fetchedDocs: DocumentItem[] = [];
        snapshot.forEach((doc) => {
          fetchedDocs.push({ id: doc.id, ...doc.data() } as DocumentItem);
        });

        setDocuments(fetchedDocs);
      } catch (err: any) {
        console.error("Error fetching documents:", err);
        setError("Failed to load documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl mx-auto w-full flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] p-4 rounded-2xl shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#FAF9F6] dark:bg-stone-800 hover:bg-[#E7E5E4] dark:hover:bg-stone-700 rounded-lg border border-[#E7E5E4] dark:border-stone-700 transition-all cursor-pointer text-stone-700 dark:text-stone-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-extrabold text-stone-900 dark:text-white text-lg leading-none">
              My Documents
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-xs mt-1">
              View your saved transcribed exam sheets.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#FAF9F6] dark:bg-[#1f2937] border border-[#E7E5E4] dark:border-[#374151] rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-full flex-grow text-stone-500">
            Loading...
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : !user ? (
          <div className="text-center text-stone-500">
            Please log in to view your documents.
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center text-stone-500 flex flex-col items-center gap-2 justify-center h-full flex-grow">
            <Layout className="w-10 h-10 text-stone-300" />
            <p>No documents saved yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-stone-800 border border-[#E7E5E4] dark:border-stone-700 p-5 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 line-clamp-1">
                    {doc.studentName || "Candidate"} -{" "}
                    {doc.subject || "General"}
                  </h3>
                  {doc.createdAt && (
                    <span className="text-[10px] text-stone-500 bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded">
                      {new Date(
                        doc.createdAt.seconds * 1000,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                  {doc.formattedText || doc.rawTranscript || "No content."}
                </p>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {doc.formattedText ? "Formatted" : "Raw Text"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
