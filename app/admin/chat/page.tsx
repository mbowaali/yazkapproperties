import TeamChat from "@/components/TeamChat";

export default function AdminTeamChatPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <TeamChat isAdmin />
    </div>
  );
}