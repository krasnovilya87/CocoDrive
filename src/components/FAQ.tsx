import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, ChevronRight, MessageCircle, CreditCard, Shield, MapPin, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';

interface FAQProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FAQ: React.FC<FAQProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();

  const faqTitles: Record<string, { title: string; subtitle: string; stillHaveQuestions: string; ourTeam: string; chatWithUs: string; close: string; home: string }> = {
    en: { 
      title: "FAQ", 
      subtitle: "Frequently Asked Questions",
      stillHaveQuestions: "Still have questions?",
      ourTeam: "Our team is here to help you via WhatsApp.",
      chatWithUs: "Chat with us",
      close: "Close",
      home: "Home"
    },
    ru: { 
      title: "FAQ", 
      subtitle: "Часто задаваемые вопросы",
      stillHaveQuestions: "Остались вопросы?",
      ourTeam: "Наша команда готова помочь вам через WhatsApp.",
      chatWithUs: "Написать нам",
      close: "Закрыть",
      home: "Главная"
    },
    id: { 
      title: "FAQ", 
      subtitle: "Pertanyaan yang Sering Diajukan",
      stillHaveQuestions: "Masih punya pertanyaan?",
      ourTeam: "Tim kami siap membantu Anda melalui WhatsApp.",
      chatWithUs: "Hubungi kami",
      close: "Tutup",
      home: "Beranda"
    },
    fr: { 
      title: "FAQ", 
      subtitle: "Questions Fréquemment Posées",
      stillHaveQuestions: "Vous avez encore des questions ?",
      ourTeam: "Notre équipe est là pour vous aider via WhatsApp.",
      chatWithUs: "Discutez avec nous",
      close: "Fermer",
      home: "Accueil"
    },
    de: { 
      title: "FAQ", 
      subtitle: "Häufig gestellte Fragen",
      stillHaveQuestions: "Haben Sie noch Fragen?",
      ourTeam: "Unser Team hilft Ihnen gerne über WhatsApp weiter.",
      chatWithUs: "Chatten Sie mit uns",
      close: "Schließen",
      home: "Startseite"
    }
  };

  const currentTitles = faqTitles[language] || faqTitles.en;

  const categoriesByLang: Record<string, { title: string; questions: { q: string; a: string }[] }[]> = {
    en: [
      {
        title: "General Questions",
        questions: [
          {
            q: "How does Bali Rent Bike work?",
            a: "We are a booking platform (aggregator) that connects you with reliable local bike owners and rental agencies. We find the best deals, verify the bikes, and help you secure your booking so you don't have to waste time searching on the street."
          },
          {
            q: "Do I need an International Driving Permit (IDP)?",
            a: "Yes. To ride legally in Bali, you must have a valid motorcycle license from your home country and an International Driving Permit (Category A). Riding without it can lead to fines or issues with your travel insurance."
          },
          {
            q: "What is included in the rental price?",
            a: "Usually, the price includes: two helmets, raincoat (upon request), delivery to your hotel or airport (check the specific bike's terms), and basic maintenance support."
          }
        ]
      },
      {
        title: "Booking & Payment",
        questions: [
          {
            q: "Why do I need to pay a commitment deposit?",
            a: "The deposit is used to 'lock' the bike in the owner's calendar. Since we work with independent owners, this ensures the bike won't be rented out to someone else before you arrive."
          },
          {
            q: "How can I pay?",
            a: "We support several convenient methods: QRIS (local standard for instant digital payments), Bank Transfer (to a local Indonesian account), and Cash (for the remaining balance upon delivery)."
          },
          {
            q: "Is my booking confirmed immediately?",
            a: "All bookings are 'On Request.' Once you submit a request, we contact the owner to confirm availability. You will receive a confirmation message via WhatsApp/Email within 30–60 minutes."
          }
        ]
      },
      {
        title: "On the Road (Safety & Liability)",
        questions: [
          {
            q: "What happens if the bike breaks down?",
            a: "Contact us or the owner immediately via WhatsApp. The owner is responsible for technical maintenance. They will either send a mechanic to your location or replace the bike if it cannot be fixed quickly."
          },
          {
            q: "What should I do in case of an accident?",
            a: "Stay calm and contact the owner. Please note that the customer is responsible for any damage to the bike or third-party property during the rental period. We highly recommend having comprehensive travel insurance that covers motorcycle riding."
          },
          {
            q: "Who is responsible for the bike's condition?",
            a: "The direct owner (rental agency) is responsible for the bike's safety and maintenance. Bali Rent Bike acts as an intermediary to help you find and book the vehicle, but the final rental agreement is between you and the owner."
          }
        ]
      },
      {
        title: "Delivery & Returns",
        questions: [
          {
            q: "Can you deliver the bike to the airport?",
            a: "Yes, most of our partners offer airport delivery. Please provide your flight number and arrival time during booking so the agent can meet you at the terminal."
          },
          {
            q: "Can I return the bike in a different location?",
            a: "This depends on the owner's policy. Some allow 'One-Way' rentals (e.g., pick up in Canggu, drop off in Ubud) for an extra fee. Please check this with us before confirming your booking."
          }
        ]
      }
    ],
    ru: [
      {
        title: "Общие вопросы",
        questions: [
          {
            q: "Как работает CocoDrive?",
            a: "Мы являемся платформой бронирования (агрегатором), которая связывает вас с надежными местными владельцами мотоциклов и агентствами по прокату. Мы находим лучшие предложения, проверяем байки и помогаем вам закрепить бронирование, чтобы вы не тратили время на поиски на улице."
          },
          {
            q: "Нужно ли мне Международное Водительское Удостоверение (МВУ)?",
            a: "Да. Чтобы законно ездить на Бали, у вас должны быть действующие права категории А из вашей страны и Международное Водительское Удостоверение (категория А). Вождение без него может привести к штрафам или проблемам с туристической страховкой."
          },
          {
            q: "Что входит в стоимость аренды?",
            a: "Обычно в стоимость входят: два шлема, дождевик (по запросу), доставка до вашего отеля или аэропорта (уточняйте условия конкретного байка) и базовая техническая поддержка."
          }
        ]
      },
      {
        title: "Бронирование и оплата",
        questions: [
          {
            q: "Зачем платить гарантийный депозит?",
            a: "Депозит используется для резервирования байка в календаре владельца. Поскольку мы работаем с независимыми партнерами, это гарантирует, что мотоцикл не будет сдан кому-то другому до вашего приезда."
          },
          {
            q: "Как я могу оплатить?",
            a: "Мы поддерживаем несколько удобных способов: QRIS (местный стандарт быстрых цифровых платежей), банковский перевод (на местный индонезийский счет) и наличные (для оставшейся суммы при получении)."
          },
          {
            q: "Мое бронирование подтверждается сразу?",
            a: "Все бронирования оформляются 'По запросу'. После отправки запроса мы связываемся с владельцем для подтверждения наличия. Вы получите подтверждение в WhatsApp или на Email в течение 30–60 минут."
          }
        ]
      },
      {
        title: "В дороге (безопасность и ответственность)",
        questions: [
          {
            q: "Что делать, если байк сломается?",
            a: "Срочно свяжитесь с нами или владельцем через WhatsApp. Владелец несет ответственность за техническое обслуживание. Он отправит механика к вам или заменит байк, если его нельзя быстро починить."
          },
          {
            q: "Что делать в случае аварии?",
            a: "Сохраняйте спокойствие и свяжитесь с владельцем. Обратите внимание, что арендатор несет ответственность за любые повреждения байка или чужого имущества во время аренды. Мы настоятельно рекомендуем приобрести туристическую страховку, покрывающую езду на мотоцикле."
          },
          {
            q: "Кто отвечает за состояние байка?",
            a: "Прямой владелец отвечает за безопасность и обслуживание мотоцикла. CocoDrive выступает в роли посредника, помогая вам найти и забронировать транспорт, но окончательный договор аренды заключается между вами и владельцем."
          }
        ]
      },
      {
        title: "Доставка и возврат",
        questions: [
          {
            q: "Возможна ли доставка байка в аэропорт?",
            a: "Да, большинство наших партнеров предлагают доставку в аэропорт. Пожалуйста, укажите номер вашего рейса и время прибытия при бронировании, чтобы агент встретил вас у терминала."
          },
          {
            q: "Можно ли вернуть байк в другом месте?",
            a: "Это зависит от политики владельца. Некоторые разрешают аренду в одну сторону (например, получение в Чангу, возврат в Убуде) за дополнительную плату. Пожалуйста, уточните это у нас перед подтверждением бронирования."
          }
        ]
      }
    ],
    id: [
      {
        title: "Pertanyaan Umum",
        questions: [
          {
            q: "Bagaimana cara kerja CocoDrive?",
            a: "Kami adalah platform pemesanan (agregator) yang menghubungkan Anda dengan pemilik motor dan agen rental lokal tepercaya. Kami mencarikan penawaran terbaik, memverifikasi motor, dan membantu mengamankan pesanan Anda."
          },
          {
            q: "Apakah saya memerlukan SIM Internasional?",
            a: "Ya. Untuk berkendara secara sah di Bali, Anda harus memiliki SIM motor yang valid dari negara asal Anda dan SIM Internasional (Kategori A)."
          },
          {
            q: "Apa saja yang termasuk dalam harga rental?",
            a: "Biasanya, harga sudah termasuk: dua helm, jas hujan (berdasarkan permintaan), pengantaran ke hotel atau bandara Anda, dan dukungan pemeliharaan dasar."
          }
        ]
      },
      {
        title: "Pemesanan & Pembayaran",
        questions: [
          {
            q: "Mengapa saya harus membayar deposit komitmen?",
            a: "Deposit ini digunakan untuk mengamankan kendaraan pada kalender pemilik sehingga motor tidak akan disewakan kepada orang lain sebelum Anda tiba."
          },
          {
            q: "Bagaimana saya bisa membayar?",
            a: "Kami mendukung beberapa metode mudah: QRIS, Transfer Bank ke rekening lokal Indonesia, dan Tunai saat pengantaran."
          },
          {
            q: "Apakah pesanan langsung terkonfirmasi?",
            a: "Semua pemesanan berstatus 'Berdasarkan Permintaan'. Kami akan menghubungi pemilik motor terlebih dahulu. Konfirmasi akan diberikan via WhatsApp/Email dalam 30-60 menit."
          }
        ]
      },
      {
        title: "Di Jalan (Keselamatan & Tanggung Jawab)",
        questions: [
          {
            q: "Apa yang terjadi jika motor mogok?",
            a: "Hubungi kami atau pemilik motor segera melalui WhatsApp. Pemilik bertanggung jawab atas pemeliharaan teknis dan akan mengirimkan mekanik atau mengganti motor jika tidak bisa diperbaiki dengan cepat."
          },
          {
            q: "Apa yang harus saya lakukan saat terjadi kecelakaan?",
            a: "Tetap tenang dan hubungi pemilik motor. Penyewa bertanggung jawab atas kerusakan motor atau properti pihak ketiga selama masa sewa."
          },
          {
            q: "Siapa yang bertanggung jawab atas kondisi motor?",
            a: "Pemilik langsung (agen rental) bertanggung jawab atas keselamatan dan pemeliharaan motor. CocoDrive bertindak sebagai perantara pemesanan."
          }
        ]
      },
      {
        title: "Pengantaran & Pengembalian",
        questions: [
          {
            q: "Apakah bisa mengantar motor ke Bandara?",
            a: "Ya, sebagian besar mitra kami menawarkan pengantaran gratis ke Bandara Bali. Silakan informasikan detail penerbangan Anda saat pemesanan."
          },
          {
            q: "Apakah bisa mengembalikan motor di lokasi yang berbeda?",
            a: "Tergantung kebijakan mitra pemilik. Beberapa mengizinkan dengan biaya tambahan. Silakan konfirmasi dengan kami terlebih dahulu."
          }
        ]
      }
    ],
    fr: [
      {
        title: "Questions Générales",
        questions: [
          {
            q: "Comment fonctionne CocoDrive ?",
            a: "Nous sommes un agrégateur de réservation qui vous met en relation avec des agences de location de scooters locales de confiance. Nous trouvons les meilleures offres et vous aidons à réserver en toute sécurité."
          },
          {
            q: "Ai-je besoin d'un permis de conduire international ?",
            a: "Oui. Pour conduire en toute légalité à Bali, vous devez être titulaire d'un permis moto valide de votre pays et d'un permis de conduire international (catégorie A)."
          },
          {
            q: "Qu'est-ce qui est inclus dans le prix de location ?",
            a: "Généralement : deux casques, une cape de pluie (sur demande), la livraison à l'hôtel ou à l'aéroport et une assistance technique de base."
          }
        ]
      },
      {
        title: "Réservation & Paiement",
        questions: [
          {
            q: "Pourquoi dois-je payer un acompte de réservation ?",
            a: "L'acompte sert à bloquer le scooter dans le calendrier du propriétaire afin qu'il ne soit pas loué à quelqu'un d'autre avant votre arrivée."
          },
          {
            q: "Comment puis-je payer ?",
            a: "Nous acceptons le QRIS locale, les virements bancaires vers un compte indonésien, et le paiement en espèces à la livraison."
          },
          {
            q: "Ma réservation est-elle confirmée immédiatement ?",
            a: "Toutes les demandes de réservation sont transmises au propriétaire. Vous recevrez une confirmation par WhatsApp ou e-mail sous 30 à 60 minutes."
          }
        ]
      },
      {
        title: "Sur la Route (Sécurité & Responsabilité)",
        questions: [
          {
            q: "Que se passe-t-il en cas de panne ?",
            a: "Contactez-nous ou l'agence immédiatement sur WhatsApp. L'agence est responsable de l'entretien et enverra un mécanicien ou remplacera le scooter rapidement."
          },
          {
            q: "Que faire en cas d'accident ?",
            a: "Restez calme et prévenez l'agence. Le locataire est responsable des dommages causés au scooter ou aux tiers. Une assurance voyage est fortement recommandée."
          },
          {
            q: "Qui est responsable de l'état du scooter ?",
            a: "Le propriétaire direct (agence de location) est responsable de l'état de son véhicule. CocoDrive agit en qualité d'intermédiaire de réservation."
          }
        ]
      },
      {
        title: "Livraison & Retours",
        questions: [
          {
            q: "Pouvez-vous livrer le scooter à l'aéroport ?",
            a: "Oui, la plupart de nos partenaires proposent la livraison à l'aéroport de Bali. Veuillez renseigner votre heure d'arrivée et numéro de vol."
          },
          {
            q: "Puis-je rendre le scooter dans un autre endroit ?",
            a: "Cela dépend de la politique de l'agence. Certaines autorisent un retour dans une autre ville moyennant des frais supplémentaires."
          }
        ]
      }
    ],
    de: [
      {
        title: "Allgemeine Fragen",
        questions: [
          {
            q: "Wie funktioniert CocoDrive?",
            a: "Wir sind eine Buchungsplattform, die Sie mit zuverlässigen lokalen Motorradvermietern verbindet. Wir suchen die besten Preise heraus, überprüfen die Fahrzeuge und sichern Ihre Reservierung."
          },
          {
            q: "Benötige ich einen internationalen Führerschein?",
            a: "Ja. Um legal auf Bali zu fahren, müssen Sie einen gültigen Motorradführerschein aus Ihrem Heimatland und einen Internationalen Führerschein (Klasse A) besitzen."
          },
          {
            q: "Was ist im Mietpreis enthalten?",
            a: "In der Regel enthält der Preis: zwei Helme, einen Regenponcho (auf Anfrage), die Lieferung an Ihr Hotel oder den Flughafen sowie grundlegende Wartungsunterstützung."
          }
        ]
      },
      {
        title: "Buchung & Bezahlung",
        questions: [
          {
            q: "Warum muss ich eine Anzahlung leisten?",
            a: "Die Anzahlung dient dazu, das Motorrad für Sie zu reservieren, so dass es vor Ihrer Ankunft nicht an Dritte vermietet wird."
          },
          {
            q: "Wie kann ich bezahlen?",
            a: "Wir unterstützen QRIS, Banküberweisungen auf ein lokales indonesisches Konto sowie Barzahlung bei der Lieferung."
          },
          {
            q: "Ist meine Buchung sofort bestätigt?",
            a: "Alle Anfragen werden manuell beim Vermieter rückbestätigt. Sie erhalten eine Benachrichtigung per WhatsApp/E-Mail innerhalb von 30-60 Minuten."
          }
        ]
      },
      {
        title: "Unterwegs (Sicherheit & Haftung)",
        questions: [
          {
            q: "Was passiert bei einer Panne?",
            a: "Kontaktieren Sie uns oder den Vermieter sofort per WhatsApp. Der Vermieter ist für die Behebung technischer Defekte verantwortlich und tauscht das Fahrzeug gegebenenfalls aus."
          },
          {
            q: "Was ist im Falle eines Unfalls zu tun?",
            a: "Ruhe bewahren und den Vermieter kontaktieren. Der Mieter haftet für Schäden am Fahrzeug oder gegenüber Dritten während der Mietlaufzeit."
          },
          {
            q: "Wer haftet für den Zustand des Motorrads?",
            a: "Der Eigentümer (Vermieter) haftet für die Sicherheit und den Zustand des Fahrzeugs. CocoDrive fungiert ausschließlich als Vermittler."
          }
        ]
      },
      {
        title: "Lieferung & Rückgabe",
        questions: [
          {
            q: "Kann das Motorrad zum Flughafen geliefert werden?",
            a: "Ja, die meisten Partner bieten eine Lieferung zum Flughafen an. Bitte geben Sie Ihre Flugnummer und die Ankunftszeit während der Buchung an."
          },
          {
            q: "Kann ich das Fahrzeug an einem anderen Ort zurückgeben?",
            a: "Die Einwegmiete hängt von den Richtlinien des jeweiligen Vermieters ab und ist meist gegen eine zusätzliche Gebühr möglich."
          }
        ]
      }
    ]
  };

  const categories = (categoriesByLang[language] || categoriesByLang.en).map((cat, idx) => {
    const icons = [
      <HelpCircle className="w-4 h-4" />,
      <CreditCard className="w-4 h-4" />,
      <Shield className="w-4 h-4" />,
      <MapPin className="w-4 h-4" />
    ];
    return {
      title: cat.title,
      icon: icons[idx] || <HelpCircle className="w-4 h-4" />,
      questions: cat.questions
    };
  });

  const footerDict: Record<string, Record<string, string>> = {
    "FAQ": {
      en: "FAQ",
      ru: "Вопросы",
      id: "FAQ",
      fr: "FAQ",
      de: "FAQ"
    },
    "Privacy Policy": {
      en: "Privacy Policy",
      ru: "Конфиденциальность",
      id: "Kebijakan Privasi",
      fr: "Confidentialité",
      de: "Datenschutz"
    },
    "Terms of Service": {
      en: "Terms of Service",
      ru: "Условия услуг",
      id: "Ketentuan Layanan",
      fr: "Conditions d'utilisation",
      de: "Nutzungsbedingungen"
    },
    "Data Deletion": {
      en: "Data Deletion",
      ru: "Удаление данных",
      id: "Penghapusan Data",
      fr: "Suppression des données",
      de: "Datenlöschung"
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-black text-foreground">{currentTitles.title}</h2>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mt-0.5">{currentTitles.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  to="/"
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-[10px] font-bold uppercase tracking-widest text-muted"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {currentTitles.home}
                </Link>
                <button 
                  onClick={onClose}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 active:scale-95"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-10">
              {categories.map((category, catIdx) => (
                <section key={catIdx} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary">
                      {category.icon}
                    </div>
                    <h3 className="text-lg font-display font-bold text-foreground">{category.title}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {category.questions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors group">
                        <div className="flex gap-3">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                          <h4 className="text-sm font-bold text-foreground leading-snug">{q.q}</h4>
                        </div>
                        <p className="text-muted text-xs leading-relaxed pl-7">
                          {q.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              
              {/* Contact Help */}
              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-foreground font-bold text-sm">{currentTitles.stillHaveQuestions}</h4>
                  <p className="text-muted text-xs">{currentTitles.ourTeam}</p>
                </div>
                <a 
                  href="https://wa.me/6281236335108"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  {currentTitles.chatWithUs}
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/5 space-y-4">
              <button 
                onClick={onClose}
                className="w-full h-12 bg-white text-black rounded-xl font-display font-black text-sm hover:scale-[1.01] active:scale-[0.98] transition-all"
              >
                {currentTitles.close}
              </button>
              <div className="flex flex-col items-center gap-3 pt-2 pb-2">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                  <Link to="/faq" className="text-[9px] text-muted uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4">{footerDict["FAQ"][language] || "FAQ"}</Link>
                  <span className="text-[9px] text-muted/20">•</span>
                  <a href="/privacy.html" className="text-[9px] text-muted uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4">{footerDict["Privacy Policy"][language] || "Privacy Policy"}</a>
                  <span className="text-[9px] text-muted/20">•</span>
                  <a href="/terms.html" className="text-[9px] text-muted uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4">{footerDict["Terms of Service"][language] || "Terms of Service"}</a>
                  <span className="text-[9px] text-muted/20">•</span>
                  <a href="/data-deletion.html" className="text-[9px] text-muted uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-4">{footerDict["Data Deletion"][language] || "Data Deletion"}</a>
                </div>
                <p className="text-[8px] text-muted uppercase tracking-[0.3em] opacity-30">
                  © {new Date().getFullYear()} CocoDrive. All rights reserved.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
