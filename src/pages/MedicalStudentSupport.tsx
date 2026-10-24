import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { BookOpen, GraduationCap, Mail, MessageCircle, Stethoscope } from "lucide-react";
import { SITE_URL, updateMetaTags } from "@/lib/seo";

const CANONICAL = `${SITE_URL}/medical-student-support-kenya`;
const WHATSAPP = "https://wa.me/254115475543";
const EMAIL = "hydrosafecare@gmail.com";

export default function MedicalStudentSupport() {
  useEffect(() => {
    updateMetaTags({
      title: "Medical Student Support in Kenya | MKU MBChB Peer Guidance",
      description: "An MBChB student at Mount Kenya University invites medical students in Kenya to discuss study strategies, clinical learning, academic pressure, and peer support.",
      url: CANONICAL,
      keywords: ["medical student support Kenya", "MKU MBChB student", "Mount Kenya University medical students", "medical school academic pressure", "MBChB study advice Kenya", "medical student peer support"],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Medical Student Support in Kenya",
        description: "Peer-to-peer medical education conversations, study guidance, and learning-resource support for medical students in Kenya.",
        url: CANONICAL,
        inLanguage: "en-KE",
        isPartOf: { "@type": "WebSite", name: "OmpathStudy", url: SITE_URL }
      }
    });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet><meta name="robots" content="index,follow,max-image-preview:large" /></Helmet>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"><GraduationCap className="h-4 w-4" /> Peer support · Medical education · Kenya</div>
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Medical School Can Be Challenging. You Do Not Have to Figure Everything Out Alone.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Medical training brings lectures, examinations, clinical rotations, ward rounds, logbooks, and the pressure to keep improving. Sometimes you need a study resource. Sometimes you need to compare approaches with another student. And sometimes you simply need a conversation with someone who understands the journey.</p>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">I am an MBChB student at Mount Kenya University (MKU) and the person behind OmpathStudy, a growing medical-learning platform. I welcome respectful conversations with medical students across Kenya about learning, study routines, clinical training, and the challenges of medical school.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><MessageCircle className="h-5 w-5" /> Talk on WhatsApp</a>
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Medical student peer support")}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition hover:border-primary"><Mail className="h-5 w-5" /> Send an email</a>
            <a href="https://www.ompathstudy.com" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition hover:border-primary"><BookOpen className="h-5 w-5" /> Explore OmpathStudy</a>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <article className="space-y-4 leading-7 text-muted-foreground">
            <h2 className="font-serif text-2xl font-bold text-foreground">What can we talk about?</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Planning revision for MBChB assessments, CATs, and end-of-semester examinations.</li>
              <li>Making ward rounds, clerking, logbooks, and bedside learning more manageable.</li>
              <li>Moving from preclinical subjects to clinical medicine and case-based reasoning.</li>
              <li>Managing academic pressure and building a realistic study routine.</li>
              <li>Finding medical notes, MCQs, flashcards, and other learning resources.</li>
              <li>Sharing experiences with peers from MKU and other Kenyan medical schools.</li>
            </ul>
            <p>You do not need to attend MKU to reach out. Students from other medical schools are welcome, and you can start with one specific question or simply introduce yourself.</p>
          </article>
          <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Stethoscope className="mb-3 h-7 w-7 text-primary" />
            <h2 className="font-serif text-xl font-bold">Peer support, not a clinical consultation</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">I can share my experience as a fellow student and point you toward educational resources. I cannot replace your lecturers, clinical supervisors, a qualified clinician, or a mental health professional. Do not send patient-identifiable information, clinical records, or confidential university material.</p>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" /> Start a conversation</a>
          </aside>
        </div>
        <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-bold">Learning support through OmpathStudy</h2>
          <p className="mt-3 leading-7 text-muted-foreground">OmpathStudy is being developed to make medical learning more organized and accessible, with study notes, practice questions, explanations, flashcards, and revision tools. It is intended to complement—not replace—teaching, textbooks, supervision, and clinical judgment.</p>
          <a href="https://www.ompathstudy.com" className="mt-5 inline-flex items-center gap-2 font-semibold text-primary hover:underline">Visit OmpathStudy <BookOpen className="h-4 w-4" /></a>
        </div>
      </section>
    </main>
  );
}
