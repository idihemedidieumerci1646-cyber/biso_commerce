"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";

type Sale = {
  id: string;
  product_name: string;
  quantity: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

export default function ReportsPage() {

  const [todayFc, setTodayFc] = useState(0);
  const [todayUsd, setTodayUsd] = useState(0);
  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitUsd, setTodayProfitUsd] = useState(0);

  const [yesterdayFc, setYesterdayFc] = useState(0);
  const [yesterdayUsd, setYesterdayUsd] = useState(0);
  const [yesterdayProfitFc, setYesterdayProfitFc] = useState(0);
  const [yesterdayProfitUsd, setYesterdayProfitUsd] = useState(0);

  const [beforeYesterdayFc, setBeforeYesterdayFc] = useState(0);
  const [beforeYesterdayUsd, setBeforeYesterdayUsd] = useState(0);
  const [beforeYesterdayProfitFc, setBeforeYesterdayProfitFc] = useState(0);
  const [beforeYesterdayProfitUsd, setBeforeYesterdayProfitUsd] = useState(0);

  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [showAll, setShowAll] = useState(false);


  useEffect(() => {
    load();
  }, []);


  const load = async () => {

    const phone = localStorage.getItem("phone");

    if (!phone) return;


    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();


    if (!user) return;


    const { data: sales, error } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id);


    if (error) {
      console.log(error);
      return;
    }


    const now = new Date();

    const today =
      new Date().toISOString().split("T")[0];


    const y = new Date();
    y.setDate(now.getDate() - 1);

    const yesterday =
      y.toISOString().split("T")[0];


    const by = new Date();
    by.setDate(now.getDate() - 2);

    const beforeYesterday =
      by.toISOString().split("T")[0];



    let tFc = 0;
    let tUsd = 0;
    let tPfFc = 0;
    let tPfUsd = 0;


    let yFc = 0;
    let yUsd = 0;
    let yPfFc = 0;
    let yPfUsd = 0;


    let byFc = 0;
    let byUsd = 0;
    let byPfFc = 0;
    let byPfUsd = 0;



    sales?.forEach((s: Sale) => {

      const date =
        s.created_at.split("T")[0];


      const vente =
        Number(s.total_sale || 0);


      const benefice =
        Number(s.profit || 0);



      if (date === today) {

        if (s.currency === "FC") {
          tFc += vente;
          tPfFc += benefice;
        } else {
          tUsd += vente;
          tPfUsd += benefice;
        }

      }



      if (date === yesterday) {

        if (s.currency === "FC") {
          yFc += vente;
          yPfFc += benefice;
        } else {
          yUsd += vente;
          yPfUsd += benefice;
        }

      }



      if (date === beforeYesterday) {

        if (s.currency === "FC") {
          byFc += vente;
          byPfFc += benefice;
        } else {
          byUsd += vente;
          byPfUsd += benefice;
        }

      }

    });



    setTodayFc(tFc);
    setTodayUsd(tUsd);
    setTodayProfitFc(tPfFc);
    setTodayProfitUsd(tPfUsd);


    setYesterdayFc(yFc);
    setYesterdayUsd(yUsd);
    setYesterdayProfitFc(yPfFc);
    setYesterdayProfitUsd(yPfUsd);


    setBeforeYesterdayFc(byFc);
    setBeforeYesterdayUsd(byUsd);
    setBeforeYesterdayProfitFc(byPfFc);
    setBeforeYesterdayProfitUsd(byPfUsd);



    const sorted =
      sales?.sort(
        (a,b)=>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      ) || [];



    setSalesHistory(sorted);
    setFilteredSales(sorted);

  };


  const displayedSales =
    showAll
      ? filteredSales
      : filteredSales.slice(0,7);



  const searchByDate = () => {

    if (!selectedDate) {

      setFilteredSales(salesHistory);
      return;

    }


    setFilteredSales(
      salesHistory.filter(
        s =>
        s.created_at.split("T")[0]
        === selectedDate
      )
    );

  };
    const downloadPDF = () => {

    const dataToExport = selectedDate
      ? salesHistory.filter(
          (s) =>
            s.created_at.split("T")[0] === selectedDate
        )
      : filteredSales;


    const doc = new jsPDF();


    doc.setFontSize(18);
    doc.text(
      "RAPPORT BISO GESTION",
      20,
      20
    );


    doc.setFontSize(12);

    doc.text(
      "Date : " +
      (selectedDate || "Toutes les dates"),
      20,
      40
    );


    let totalFc = 0;
    let totalUsd = 0;
    let profitFc = 0;
    let profitUsd = 0;



    dataToExport.forEach((s)=>{

      if(s.currency==="FC"){

        totalFc += Number(s.total_sale || 0);
        profitFc += Number(s.profit || 0);

      }else{

        totalUsd += Number(s.total_sale || 0);
        profitUsd += Number(s.profit || 0);

      }

    });



    doc.text(
      "Ventes FC : "+totalFc+" FC",
      20,
      60
    );

    doc.text(
      "Ventes USD : "+totalUsd+" $",
      20,
      70
    );

    doc.text(
      "Benefice FC : "+profitFc+" FC",
      20,
      85
    );

    doc.text(
      "Benefice USD : "+profitUsd+" $",
      20,
      95
    );


    doc.line(
      20,
      105,
      190,
      105
    );


    let y = 120;


    doc.text(
      "PRODUITS VENDUS",
      20,
      y
    );


    dataToExport.forEach((s)=>{

      y += 12;


      if(y > 270){

        doc.addPage();
        y = 20;

      }


      doc.setFontSize(11);


      doc.text(
        "Produit : "+s.product_name,
        20,
        y
      );


      y += 6;


      doc.text(
        "Quantite : "+s.quantity,
        25,
        y
      );


      y += 6;


      doc.text(
        "Montant : "+
        s.total_sale+
        " "+
        s.currency,
        25,
        y
      );

    });


    doc.save(
      "rapport-" +
      (selectedDate || "complet")
      +
      ".pdf"
    );

  };



  return (

    <main
      className="
      min-h-screen
      p-4
      sm:p-6
      text-white
      bg-gradient-to-b
      from-black
      via-slate-950
      to-black
      relative
      overflow-hidden
      "
    >


      {/* LUMIERES BACKGROUND */}

      <div
        className="
        absolute
        top-0
        left-0
        w-72
        h-72
        bg-orange-500/20
        blur-3xl
        rounded-full
        "
      />


      <div
        className="
        absolute
        right-0
        top-40
        w-80
        h-80
        bg-blue-500/20
        blur-3xl
        rounded-full
        "
      />



      <div
        className="
        max-w-6xl
        mx-auto
        space-y-6
        relative
        z-10
        "
      >



        {/* HEADER GLASS */}


        <div
          className="
          rounded-3xl
          p-6
          bg-white/5
          backdrop-blur-xl
          border
          border-white/10
          shadow-xl
          "
        >

          <h1
            className="
            text-3xl
            font-black
            "
          >
            📊 Rapports PRO
          </h1>


          <p
            className="
            text-slate-400
            text-sm
            mt-2
            "
          >
            Analyse ventes, bénéfices et performance caisse
          </p>


        </div>



        {/* INFO GUIDE */}


        <div
          className="
          rounded-2xl
          p-4
          bg-slate-900/70
          backdrop-blur
          border
          border-blue-500/20
          "
        >

          <p
            className="
            text-sm
            text-slate-300
            "
          >

            💡 Sélectionne une date pour filtrer
            tes ventes puis exporte ton rapport PDF.

          </p>


        </div>
                {/* STATISTIQUES */}

        <Section title="🔥 Aujourd’hui">

          <Card
            icon="💵"
            label="Ventes FC"
            value={`${todayFc} FC`}
          />

          <Card
            icon="💲"
            label="Ventes USD"
            value={`${todayUsd} $`}
          />

          <Card
            icon="📈"
            label="Bénéfice FC"
            value={`${todayProfitFc} FC`}
          />

          <Card
            icon="🚀"
            label="Bénéfice USD"
            value={`${todayProfitUsd} $`}
          />

        </Section>



        <Section title="📅 Hier">


          <Card
            icon="💵"
            label="Ventes FC"
            value={`${yesterdayFc} FC`}
          />


          <Card
            icon="💲"
            label="Ventes USD"
            value={`${yesterdayUsd} $`}
          />


          <Card
            icon="📈"
            label="Bénéfice FC"
            value={`${yesterdayProfitFc} FC`}
          />


          <Card
            icon="🚀"
            label="Bénéfice USD"
            value={`${yesterdayProfitUsd} $`}
          />


        </Section>




        <Section title="⏳ Avant-hier">


          <Card
            icon="💵"
            label="Ventes FC"
            value={`${beforeYesterdayFc} FC`}
          />


          <Card
            icon="💲"
            label="Ventes USD"
            value={`${beforeYesterdayUsd} $`}
          />


          <Card
            icon="📈"
            label="Bénéfice FC"
            value={`${beforeYesterdayProfitFc} FC`}
          />


          <Card
            icon="🚀"
            label="Bénéfice USD"
            value={`${beforeYesterdayProfitUsd} $`}
          />


        </Section>




        {/* HISTORIQUE */}

        <div
          className="
          bg-white/5
          backdrop-blur-xl
          border
          border-white/10
          rounded-3xl
          p-5
          shadow-xl
          "
        >


          <div
            className="
            flex
            justify-between
            items-center
            mb-5
            "
          >

            <h2
              className="
              font-black
              text-lg
              "
            >
              📅 
              {showAll
              ? " Historique complet"
              : " 7 dernières ventes"}

            </h2>



            <button

              onClick={() =>
                setShowAll(!showAll)
              }

              className="
              px-4
              py-2
              rounded-xl
              text-xs
              font-bold
              bg-gradient-to-r
              from-orange-500
              to-red-500
              shadow-lg
              "

            >

              {
                showAll
                ? "Réduire"
                : "Voir tout"
              }

            </button>


          </div>





          {
            displayedSales.length === 0 ? (

              <p
                className="
                text-slate-500
                text-sm
                "
              >
                Aucun rapport disponible
              </p>


            ) : (


              <div
                className="
                space-y-3
                "
              >

              {

              displayedSales.map((s)=>(


                <div

                  key={s.id}

                  className="
                  flex
                  justify-between
                  items-center
                  bg-black/40
                  border
                  border-white/5
                  rounded-2xl
                  p-4
                  "

                >


                  <div>

                    <p
                      className="
                      font-bold
                      "
                    >
                      📦 {s.product_name}
                    </p>


                    <p
                      className="
                      text-xs
                      text-slate-500
                      mt-1
                      "
                    >

                      {
                        new Date(
                          s.created_at
                        ).toLocaleDateString()

                      }

                    </p>


                  </div>




                  <div
                    className="
                    text-right
                    "
                  >

                    <p
                      className="
                      font-black
                      text-green-400
                      "
                    >

                      {
                        s.total_sale
                      }
                      {" "}
                      {
                        s.currency
                      }

                    </p>


                    <p
                      className="
                      text-xs
                      text-slate-500
                      "
                    >

                      Quantité x{s.quantity}

                    </p>


                  </div>


                </div>


              ))

              }


              </div>


            )
          }


        </div>
                {/* RECHERCHE PDF */}

        <div
          className="
          bg-white/5
          backdrop-blur-xl
          border
          border-white/10
          rounded-3xl
          p-5
          shadow-xl
          "
        >

          <h2
            className="
            font-black
            text-lg
            mb-4
            "
          >
            📄 Exporter un rapport PDF
          </h2>


          <div
            className="
            flex
            flex-col
            md:flex-row
            gap-3
            "
          >


            <input

              type="date"

              value={selectedDate}

              onChange={(e)=>
                setSelectedDate(e.target.value)
              }

              className="
              flex-1
              bg-black/60
              border
              border-white/10
              rounded-xl
              p-3
              text-white
              outline-none
              "

            />



            <button

              onClick={searchByDate}

              className="
              px-6
              py-3
              rounded-xl
              font-bold
              bg-gradient-to-r
              from-blue-500
              to-cyan-500
              shadow-lg
              "

            >

              🔎 Rechercher

            </button>




            <button

              onClick={downloadPDF}

              className="
              px-6
              py-3
              rounded-xl
              font-bold
              bg-gradient-to-r
              from-orange-500
              to-red-500
              shadow-lg
              "

            >

              📄 PDF

            </button>



          </div>


        </div>


      </div>


    </main>

  );

}



/* ========================= */
/* COMPONENTS UI */
/* ========================= */


function Section({
  title,
  children
}:any){


  return (

    <div
      className="
      space-y-3
      "
    >


      <h2
        className="
        text-lg
        font-black
        text-slate-200
        border-l-4
        border-orange-500
        pl-3
        "
      >

        {title}

      </h2>




      <div
        className="
        grid
        grid-cols-2
        md:grid-cols-4
        gap-4
        "
      >

        {children}

      </div>



    </div>

  );


}





function Card({
  icon,
  label,
  value
}:any){


  return (

    <div

      className="
      bg-white/5
      backdrop-blur-xl
      border
      border-white/10
      rounded-3xl
      p-4
      shadow-xl
      hover:scale-[1.02]
      transition
      "

    >


      <div
        className="
        text-2xl
        mb-3
        "
      >

        {icon}

      </div>



      <p
        className="
        text-xs
        text-slate-400
        "
      >

        {label}

      </p>



      <p
        className="
        text-xl
        font-black
        mt-1
        text-white
        "
      >

        {value}

      </p>



    </div>

  );

}