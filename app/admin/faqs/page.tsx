"use client";
import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

type Inputs = {
  question: string;
  answer: string;
};

export default function ManageFaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Inputs>();

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const response = await fetch("/api/admin/faqs");
      if (!response.ok) {
        throw new Error("Failed to fetch FAQs");
      }
      const data = await response.json();
      setFaqs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (faq: FAQ | null = null) => {
    setEditingFaq(faq);
    if (faq) {
      setValue("question", faq.question);
      setValue("answer", faq.answer);
    } else {
      reset({ question: "", answer: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFaq(null);
    reset();
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const url = editingFaq ? `/api/admin/faqs/${editingFaq.id}` : "/api/admin/faqs";
      const method = editingFaq ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(editingFaq ? "Failed to update FAQ" : "Failed to create FAQ");
      }

      await fetchFaqs();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this FAQ?")) {
      try {
        const response = await fetch(`/api/admin/faqs/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete FAQ");
        }

        await fetchFaqs();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage FAQs</h1>
        <button onClick={() => openModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add FAQ
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="table-header">Question</th>
                <th scope="col" className="table-header">Answer</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {faqs.map((faq) => (
                <tr key={faq.id}>
                  <td className="table-cell font-medium text-slate-900">{faq.question}</td>
                  <td className="table-cell">{faq.answer}</td>
                  <td className="table-cell-actions">
                    <button onClick={() => openModal(faq)} className="text-slate-600 hover:text-slate-900">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(faq.id)} className="text-red-600 hover:text-red-900 ml-4">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingFaq ? "Edit FAQ" : "Add FAQ"}</h2>
              <button onClick={closeModal}><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="question" className="label">Question</label>
                  <input
                    id="question"
                    {...register("question", { required: "Question is required" })}
                    className="input"
                  />
                  {errors.question && <p className="error-message">{errors.question.message}</p>}
                </div>
                <div>
                  <label htmlFor="answer" className="label">Answer</label>
                  <textarea
                    id="answer"
                    {...register("answer", { required: "Answer is required" })}
                    className="input h-32"
                  />
                  {errors.answer && <p className="error-message">{errors.answer.message}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}