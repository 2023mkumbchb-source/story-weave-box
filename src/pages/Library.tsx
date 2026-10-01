import { Navigate, useParams } from "react-router-dom";
import registry from "@/data/libraries.json";
import StudyFileLibrary from "@/components/StudyFileLibrary";

/** /library/year-1/anatomy/histology … — every folder has its own address so it can be shared and indexed. */
export default function Library() {
  const { year, "*": rest } = useParams();
  const def = registry.libraries.find((l) => l.slug === year);
  if (!def) return <Navigate to="/" replace />;
  const slugs = (rest ?? "").split("/").filter(Boolean);
  return <StudyFileLibrary def={def} slugs={slugs} />;
}
