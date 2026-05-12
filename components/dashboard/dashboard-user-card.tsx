"use client";

type Props = {
  clientUser: any;
};

export default function DashboardUserCard({ clientUser }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex h-full flex-col justify-center">
        <div className="mb-3 break-words text-xl font-bold md:text-2xl">
          Username: @{clientUser?.username || "Loading..."}
        </div>
        <div className="mb-2 text-sm text-foreground md:text-base">
          Gender:{" "}
          {clientUser?.gender
            ? clientUser.gender.charAt(0).toUpperCase() +
              clientUser.gender.slice(1)
            : "N/A"}
        </div>
        <div className="mb-2 text-sm text-foreground md:text-base">
          Birthdate:{" "}
          {clientUser?.dob
            ? new Date(clientUser.dob).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "N/A"}
        </div>
        <div className="text-sm text-foreground md:text-base">
          Age:{" "}
          {clientUser?.dob
            ? Math.floor(
                (new Date().getTime() - new Date(clientUser.dob).getTime()) /
                  3.15576e10,
              )
            : "N/A"}
        </div>
      </div>
    </div>
  );
}
