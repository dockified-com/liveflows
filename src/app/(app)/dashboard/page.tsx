import { listPersonalAccessTokens } from "@/server/dal/pats";
import { TokenManager } from "./token-manager";

export default async function DashboardPage() {
  const tokens = await listPersonalAccessTokens();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to LiveFlows.</p>

      <TokenManager tokens={tokens} />
    </div>
  );
}
