import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import PageTitle from "../components/PageTitle";
import { useQuote } from "../state/QuoteContext";

// Placeholder for pages that haven't been built yet.
export default function ComingSoon({ title, description }: { title: string; description: string }) {
  const { totalWse } = useQuote();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageTitle eyebrow="Coming soon" title={title} subtitle={description} />
      <Card>
        <CardContent className="p-4 sm:p-6 text-navy">
          <p className="font-semibold">This page is under construction.</p>
          <p className="text-sm text-tngray-dark mt-1">
            {totalWse > 0
              ? `It will use the quote details from the Setup page (${totalWse} total WSE).`
              : <>Enter the quote details on the <Link to="/" className="underline text-orange-dark">Setup page</Link> first.</>}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
