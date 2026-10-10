"use client";

export default function FaqPage() {
  return (
    <main className="container-page max-w-3xl py-8 sm:py-12">
      <div className="card space-y-5">
        <div>
          <h1 className="text-xl font-bold text-primary-dark">Frequently Asked Questions</h1>
          <p className="mt-1 text-sm text-slate-500">Find answers to common questions.</p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-800">What are the rules for cooking in the shared kitchen?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Please don’t cook beans in the rice cooker. Please use the pressure cooker on the gas stove instead.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Why did the washing machine stop working?</h2>
            <p className="mt-1 text-sm text-slate-600">
              The washing machine recently broke down and locked itself because foreign coins were used instead of UAE Dirhams. This causes the machine to shut down for everyone.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">What should I do if I accidentally use the wrong currency?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Please contact the property manager immediately. Do not attempt to force the machine open or use it further.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">What are the rules for using the laundry machines?</h2>
            <p className="mt-1 text-sm text-slate-600">
              <strong>Zero Tolerance:</strong> Do not attempt to use any currency other than UAE Dirhams.
              <br />
              <strong>Camera Surveillance:</strong> We have CCTV cameras installed in the laundry area. While we are not checking the footage for this first incident, we will review the recordings if this happens again.
              <br />
              <strong>Identification:</strong> If the machine locks again, we will check the footage and the usage logs to identify the last person at the machine. That individual will be held responsible for the full repair costs.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-800">What are the bank details for rent payment?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Please use the following details for bank transfers:
              <br />
              <strong>IBAN:</strong> AE88 0260 0002 1471 9079 501
              <br />
              <strong>Account Number:</strong> 0214719079501
              <br />
              <strong>Swift Code:</strong> EBILAEAD
              <br />
              <strong>Routing Number:</strong> 202620103
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}