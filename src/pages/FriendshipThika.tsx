import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, MessageCircle, MapPin, Heart, ShieldCheck } from "lucide-react";
import { SITE_URL, updateMetaTags } from "@/lib/seo";

const CANONICAL = `${SITE_URL}/looking-for-a-friend-in-thika`;
const WHATSAPP = "https://wa.me/254115475543";
const EMAIL = "hydrosafecare@gmail.com";

export default function FriendshipThika() {
  useEffect(() => {
    updateMetaTags({
      title: "Looking for a Friend in Thika, Kenya | Make Genuine Connections",
      description: "Looking for a friend in Thika, around Mount Kenya University, or elsewhere in Kenya? Start a respectful conversation and make a genuine connection.",
      url: CANONICAL,
      keywords: ["looking for a friend in Thika", "friends at Mount Kenya University", "make friends in Thika Kenya", "someone to talk to Kenya", "friendship in Kenya"],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Looking for a Friend in Thika, Kenya",
        description: "A personal invitation to start a respectful friendship and conversation in Thika, Kenya.",
        url: CANONICAL,
        inLanguage: "en-KE",
        isPartOf: { "@type": "WebSite", name: "OmpathStudy", url: SITE_URL }
      }
    });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet><meta name="robots" content="index,follow,max-image-preview:large" /></Helmet>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"><MapPin className="h-4 w-4" /> Thika, Kenya · Open to connections anywhere</div>
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Looking for a Friend in Thika? Sometimes, a Conversation Is a Good Place to Start.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Life can feel heavy sometimes. You may have plenty on your mind but no one you feel comfortable talking to—or you may simply want to meet someone new. If that sounds familiar, you are welcome to say hello.</p>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">I am also looking to make genuine friends. I am based around Thika, Kenya, and welcome respectful conversations with people from different backgrounds. Whether you study at Mount Kenya University (MKU), have recently moved to Thika, or live elsewhere in Kenya, a friendship can begin with a simple message.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><MessageCircle className="h-5 w-5" /> Start a WhatsApp conversation</a>
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Hello — a new friendship")}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold transition hover:border-primary"><Mail className="h-5 w-5" /> Send an email</a>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-4xl gap-10 px-5 py-12 sm:py-16 md:grid-cols-[1.2fr_0.8fr]">
        <article className="space-y-5 leading-8 text-muted-foreground">
          <h2 className="font-serif text-2xl font-bold leading-tight text-foreground">You do not need a special reason to reach out</h2>
          <p>Maybe you want to talk about your day, school, work, your goals, relationships, or the things you rarely say out loud. Maybe you are new to the area and would like to know someone. Or maybe you just want a light conversation, a laugh, and a break from the usual routine.</p>
          <p>You do not have to pretend that everything is fine, and you do not need to have the perfect words. I value respectful, honest conversations and the possibility of building a real friendship over time.</p>
          <h2 className="pt-3 font-serif text-2xl font-bold leading-tight text-foreground">Who is welcome?</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>People looking for friendship in Thika or near Mount Kenya University.</li>
            <li>Students who want to meet people beyond their usual circles.</li>
            <li>Anyone in Kenya who would appreciate a friendly conversation.</li>
            <li>People of any gender and background who value mutual respect.</li>
          </ul>
          <p>There is no pressure to become close immediately. Start with a message, introduce yourself if you feel comfortable, and see whether conversation flows naturally.</p>
        </article>
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Heart className="mb-3 h-7 w-7 text-primary" />
          <h2 className="font-serif text-xl font-bold">A small note about safety</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Please keep first conversations respectful and avoid sharing passwords, financial details, identity documents, or other sensitive information. If you decide to meet someone in person, choose a public place and tell someone you trust.</p>
          <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Friendship starts with mutual respect, clear boundaries, and no pressure.</div>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" /> Say hello on WhatsApp</a>
        </aside>
      </section>
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-5 py-10 text-sm leading-6 text-muted-foreground">
          <h2 className="font-semibold text-foreground">Looking for friends around MKU or in Thika?</h2>
          <p className="mt-2">If you searched for “looking for a friend in Thika,” “friends at Mount Kenya University,” or “someone to talk to in Kenya,” this page is an invitation to start a genuine, respectful conversation. It is not a dating service or an emergency support service.</p>
          <p className="mt-4">This page is hosted by OmpathStudy, an educational platform for medical and health students. The friendship invitation is separate from the site's study resources.</p>
        </div>
      </section>
    </main>
  );
}
