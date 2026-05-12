/*
 * 		Toast Component
 *
 * 	Dosya:
 * 		toast.tsx
 *
 * 	Kodlama:
 * 		Burak (Nexor)
 *
 * 	Tarih:
 * 		12.05.2026, 14:46:11
 */

import { create } from "zustand";
import { runOnJS } from "react-native-worklets";
import { useCallback, useEffect, useRef } from "react";
import { Feather } from "@react-native-vector-icons/feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View, Text, Dimensions, LayoutChangeEvent, Pressable } from "react-native";
import Animated, { withTiming, interpolateColor, useSharedValue, useAnimatedStyle, Easing } from "react-native-reanimated";

// Butonu animasyonlu component olarak oluştur
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Ekran genişliğine göre tasarımı horizontal kısımlarını ayarlayacağız.
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Bu timer, toast gösterim için başlatıldıysa onun durumunu kontrol edecek.
// Sürekli gösterme ve gizleme işlemi yapıldığında bug oluşmaması için bir koruyucu önlem alacak.
let _Timer: ReturnType<typeof setTimeout> | null = null;

// Timer'ın süresi burada belirtilecek. State durumlarının güncellenmesi beklenmeyecek.
let _Sure: number = 3000;

// Toast Türleri
type ToastTur = "success" | "error" | "warning" | "info";

// Toast Türüne Göre Renkler ve Iconlar
const ToastRenkleri: Record<ToastTur, { arka_renk: string; icon: string; icon_renk: string; }> =
{
    success:
    {
        arka_renk: '#1a4e2b',
        icon: 'check-circle',
        icon_renk: '#4ade80',
    },

    error:
    {
        arka_renk: '#722525',
        icon: 'x-octagon',
        icon_renk: '#f87171',
    },

    warning:
    {
        arka_renk: '#4e3613',
        icon: 'alert-triangle',
        icon_renk: '#fbbf24',
    },

    info:
    {
        arka_renk: '#0e2a3d',
        icon: 'info',
        icon_renk: '#60a5fa',
    }
};

// Toast Durumları
interface ToastState
{
    baslik: string;
    icerik: string;
    tur: ToastTur;
    toas_durum: boolean;
    tetikle: number;

    goster: (tur: ToastTur, baslik: string, icerik: string, sure?: number) => void;
    gizle: () => void;
}

// Yüzde hesaplama fonksiyonu
export function wp(percent: number) {
    return (SCREEN_WIDTH * percent) / 100;
}

// Toast Hookunu Oluştur
export const useToast = create<ToastState>((set) => (
{
    baslik: "",
    icerik: "",
    tur: "warning",
    toas_durum: false,
    tetikle: 0,

    goster: (tur, baslik, icerik, sure = 3000) =>
    {
        if(_Timer)
        {
            clearTimeout(_Timer);
            _Timer = null;
        }

        _Sure = sure;
        set((state) => ({ tur, baslik, icerik, toas_durum: true, tetikle: state.tetikle + 1 }));
    },

    gizle: () =>
    {
        if(_Timer)
        {
            clearTimeout(_Timer);
            _Timer = null;
        }

        set({ toas_durum: false, tetikle: 0 });
    }
}));

// Sağlayıcıyı Oluştur
export function Toast()
{
    // İşleme başlamadan önce güvenli alanları kontrol edelim.
    const insets = useSafeAreaInsets();

    // İlk önce toasta ait ihtiyaç duyduğumuz verileri alalım.
    const tur = useToast((state) => state.tur);
    const toas_durum = useToast((state) => state.toas_durum);
    const toast_kapat = useToast((state) => state.gizle);
    const baslik = useToast((state) => state.baslik);
    const icerik = useToast((state) => state.icerik);
    const tetikle = useToast((state) => state.tetikle);

    // İlk kez mount oluyorsa işlemi engelleyelim.
    const ilkMount = useRef(false);

    // Daha sonra toast türüne göre mevcut renkleri alalım.
    const renkler = ToastRenkleri[tur];

    // Şimdi bu renklerin değişmesi için bir değişkende tutalım
    const oncekiRenk = useRef(renkler.arka_renk);
    const mevcutRenk = useSharedValue(renkler.arka_renk);
    const hedefRenk = useSharedValue(renkler.arka_renk);
    const colorProgress = useSharedValue(1);

    // Opaklık ve yükseklik ayarları
    const opaklik = useSharedValue(0);
    const yukseklik = useSharedValue(-1000);

    // Yüksekliği hesapla
    const onLayout = (event: LayoutChangeEvent) =>
    {
        const { height } = event.nativeEvent.layout;
        if (height > 0 && !toas_durum)
        {
            yukseklik.value = -height;
        }
    };

    // Kod fazlalığı olmasın diye renkler için ufak bir fonksiyon yazalım
    const renkGuncelle = () =>
    {
        const yeni_renk = ToastRenkleri[tur].arka_renk;

        mevcutRenk.value = oncekiRenk.current;
        hedefRenk.value = yeni_renk;
        oncekiRenk.current = yeni_renk;

        colorProgress.value = 0;
        colorProgress.value = withTiming(1, { duration: 300 });
    };

    // Bütün animasyonları güncelle
    const animStyle = useAnimatedStyle(() => {
        return {
            opacity: opaklik.value,
            backgroundColor: interpolateColor(colorProgress.value, [0, 1], [mevcutRenk.value, hedefRenk.value]),
            transform: [
                {
                    translateY: yukseklik.value
                }
            ]
        }
    });

    // Timer modunu aktif et
    const Timer_Callback = useCallback(() =>
    {
        if(_Timer) {
            clearTimeout(_Timer);
            _Timer = null;
        }

        _Timer = setTimeout(() =>
        {
            useToast.getState().gizle();
            _Timer = null;
        }, _Sure);
    }, []);

    // Toastı kapat
    const Toast_Kapat = () =>
    {
        toast_kapat();
    }

    // Şimdi ilk mount da renk geçişini ayarla
    useEffect(() => {
        renkGuncelle();
    }, [tur]);

    // Şimdi toastın görünür durumunu ayarla
    useEffect(() =>
    {
        if(ilkMount.current === false)
        {
            ilkMount.current = true;
            return;
        }

        if(toas_durum === true)
        {
            opaklik.value = 1;
            yukseklik.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) }, () =>
            {
                runOnJS(Timer_Callback)();
            });
        }
        else
        {
            opaklik.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.exp) });
            yukseklik.value = withTiming(-1000, { duration: 600, easing: Easing.in(Easing.exp) });
        }

    }, [tetikle]); // toas_durum

    useEffect(() =>
    {
        if(ilkMount.current === false) return;

        if(toas_durum === false)
        {
            opaklik.value = withTiming(0, { duration: 600, easing: Easing.in(Easing.exp) });
            yukseklik.value = withTiming(-1000, { duration: 600, easing: Easing.in(Easing.exp) });
        }

    }, [toas_durum]);

    return (
        <AnimatedPressable style={[styles.container, { paddingTop: insets.top }, animStyle]} onLayout={onLayout} onPress={Toast_Kapat}>
            <View style={styles.row}>
                <Feather name={renkler.icon as any} size={24} color={renkler.icon_renk} />
                <Text style={styles.baslik}>{baslik}</Text>
            </View>
            <Text style={styles.icerik}>{icerik}</Text>
        </AnimatedPressable>
    )
}

// Stiller
const styles = StyleSheet.create({
    container: {
        width: "100%",
        position: "absolute",
        top: 0,
        paddingVertical: 10,
        paddingHorizontal: wp(5),
        zIndex: 666,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },

    column: {
        flexDirection: "column",
    },

    baslik: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },

    icerik: {
        color: "#E5E5E5",
        fontSize: 14,
        lineHeight: 20,
    },
});

export const TGoster = (tur: ToastTur, baslik: string, icerik: string, sure?: number) => useToast.getState().goster(tur, baslik, icerik, sure);
export const TGizle = () => useToast.getState().gizle();