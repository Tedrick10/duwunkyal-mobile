# Region အရောင်ပြောင်းခြင်း – မြန်မာဘာသာ

## ပြဿနာ

Admin မှာ Customize Template အတွက် Region တွေ (Body, Collar, Sleeves) ထည့်ပြီးသားပါ။ ဒါပေမယ့် **Mobile app** မှာ **Body** ပဲ အရောင်ပြောင်းလို့ ရပါတယ်။ **Sleeve, Collar, Cut Off** ရွေးပြီး အရောင်ပြောင်းရင် မပြောင်းပါဘူး။

---

## အကြောင်းရင်း (အတိုချုပ်)

- Region တွေကို **ပုံသဏ္ဍာန်အတိအကျ** (Collar ဆို Collar အကွေးအတိုင်း) ပြောင်းချင်ရင် **Region Mask Image** တွေ လိုပါတယ်။
- Admin မှာ **“Detect regions from segments”** ခလုတ်ကို နှိပ်ပြီး **Save** လုပ်ထားမှ Backend က Mask ပုံတွေ ထုတ်ပြီး Mobile က ဒီ Mask တွေနဲ့ Sleeve / Collar / Cut Off အရောင်တွေ မှန်မှန်ကန်ကန် ပြောင်းပေးနိုင်ပါတယ်။
- Region ကို ထည့်ထားပေမယ့် **Mask မထုတ်ရသေးရင်** (သို့) **Product က ဒီ Template နဲ့ မချိတ်ရင်** Mobile မှာ Region အားလုံး မပြောင်းဘဲ Body ပဲ ပြောင်းနေတတ်ပါတယ်။

---

## လုပ်ရမယ့်အဆင့်များ

### ၁. Admin မှာ Template အတွက် Mask ထုတ်ပြီး သိမ်းပါ

1. **Admin** → **Catalog** → **Customize Templates** သွားပါ။  
2. **Front T-shirt** (သို့) **Back T-shirt** ကို **Edit** နှိပ်ပါ။  
3. ပုံ (Image) ထည့်ထားပြီးသား ဖြစ်ရပါမယ်။  
4. **“Detect regions from segments”** ခလုတ်ကို နှိပ်ပါ။  
   - Clothing Segments API ကို ခေါ်ပြီး segment list ပေါ်လာပါမယ်။  
5. **အရေးကြီး:** အောက်က **segment checkboxes** မှာ **collar**, **sleeve** (နဲ့ Cut Off / cuff ရှိရင်) ကို **ခြစ်ပါ** (check လုပ်ပါ)। Body ပဲ ခြစ်ထားရင် Mobile မှာ Body ပဲ အရောင်ပြောင်းလို့ ရပါတယ်။  
6. **“Save as default editable regions”** ခလုတ်ကို နှိပ်ပြီး ဒီ segment တွေကို app မှာ ပြင်လို့ ရအောင် သတ်မှတ်ပါ။  
7. Region တွေ ပေါ်လာပြီးရင် အောက်က **Save** ခလုတ်နဲ့ **Template** ကို သိမ်းပါ။  
8. **Back T-shirt** အတွက်လည်း အလားတူ လုပ်ပါ။  

ဒီလို လုပ်ထားမှ Product က ဒီ Template ကို သုံးတဲ့အခါ Mobile က **region_masks** ရပြီး Sleeve, Collar, Cut Off အရောင်တွေ မှန်မှန်ကန်ကန် ပြောင်းလို့ ရပါတယ်။  

---

### ၂. Product မှာ Template ချိတ်ထားခြင်း စစ်ပါ

1. **Admin** → **Catalog** → **Products** သွားပါ။  
2. ထို� Product ကို **Edit** ပါ။  
3. **Customize** အပိုင်းမှာ **Front Template** နဲ့ **Back Template** ကို သင့်တဲ့ **Front T-shirt** / **Back T-shirt** Template တွေနဲ့ ရွေးထားပါ။  
4. **Save** ပါ။  

Product က ဒီ Template တွေနဲ့ ချိတ်မှ Mobile app က ဒီ Template ရဲ့ **regions** နဲ့ **region_masks** ကို ရပါမယ်။  

---

### ၃. Mobile app မှာ ပြန်စစ်ပါ

- Product ကို ဖွင့်ပြီး **Customize** သွားပါ။  
- **Body, Sleeve, Collar, Cut Off** ထဲက တစ်ခုရွေးပြီး အရောင်ပြောင်းကြည့်ပါ။  
- Admin မှာ “Detect regions from segments” + Save လုပ်ထားပြီး Product က Template နဲ့ ချိတ်ထားရင် Sleeve / Collar / Cut Off အရောင်တွေလည်း ပြောင်းသင့်ပါတယ်။  

---

## အတိုချုပ် (မြန်မာလို)

**“Region ထည့်ပြီးသားပါဆိုပေမယ့် Mobile မှာ Sleeve, Collar, Cut Off အရောင်မပြောင်းဘဲ Body ပဲ ပြောင်းနေတာ”** ဆိုရင် —

1. **Admin** မှာ ထို� Template ကို **Edit** လုပ်ပြီး **“Detect regions from segments”** နှိပ်ကာ **Save** ထပ်လုပ်ပါ။ (Mask ပုံတွေ ထုတ်ပြီး သိမ်းဖို့)  
2. **Product** မှာ **Front / Back Customize Template** ကို ဒီ Template တွေနဲ့ **ချိတ်ထားပါ**။  
3. ပြီးရင် **Mobile** မှာ ပြန်ရွေးပြီး **Body, Sleeve, Collar, Cut Off** အရောင်တွေ ပြောင်းကြည့်ပါ။  

ဒီအဆင့်တွေ လုပ်ထားရင် Sleeve, Collar, Cut Off တွေလည်း မှန်မှန်ကန်ကန် အရောင် ပြောင်းနိုင်ပါတယ်။  
