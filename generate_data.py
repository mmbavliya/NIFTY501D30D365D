import pandas as pd
import json

def generate():
    # Load Excel file
    excel_file = 'MW-NIFTY-50-10-Jul-2026.xlsx'
    df = pd.read_excel(excel_file)
    
    # Strip whitespace from column names and string values
    df.columns = [col.strip() for col in df.columns]
    df['SYMBOL'] = df['SYMBOL'].astype(str).str.strip()
    
    # Sector mappings for Nifty 50 constituents as of July 2026
    sector_map = {
        'HDFCBANK': 'Financial Services',
        'TCS': 'IT',
        'BHARTIARTL': 'Telecommunications',
        'RELIANCE': 'Energy - Oil & Gas',
        'INFY': 'IT',
        'DRREDDY': 'Pharmaceuticals & Healthcare',
        'SBIN': 'Financial Services',
        'ICICIBANK': 'Financial Services',
        'BAJFINANCE': 'Financial Services',
        'ETERNAL': 'Consumer Services & Internet',  # Formerly Zomato
        'ADANIENT': 'Diversified / Conglomerates',
        'JIOFIN': 'Financial Services',
        'TMPV': 'Automobile',  # Tata Motors Passenger Vehicles
        'MARUTI': 'Automobile',
        'KOTAKBANK': 'Financial Services',
        'HINDALCO': 'Metals & Mining',
        'M&M': 'Automobile',
        'LT': 'Construction & Engineering',
        'AXISBANK': 'Financial Services',
        'HCLTECH': 'IT',
        'NTPC': 'Power & Utilities',
        'TATASTEEL': 'Metals & Mining',
        'BEL': 'Capital Goods & Defence',
        'EICHERMOT': 'Automobile',
        'BAJAJ-AUTO': 'Automobile',
        'HINDUNILVR': 'FMCG',
        'HDFCLIFE': 'Financial Services',
        'ITC': 'FMCG',
        'TRENT': 'Consumer Services & Retail',
        'TITAN': 'Consumer Durables',
        'SHRIRAMFIN': 'Financial Services',
        'SUNPHARMA': 'Pharmaceuticals & Healthcare',
        'WIPRO': 'IT',
        'ADANIPORTS': 'Infrastructure & Ports',
        'ASIANPAINT': 'Consumer Durables & Paints',
        'TECHM': 'IT',
        'INDIGO': 'Services - Aviation',
        'APOLLOHOSP': 'Pharmaceuticals & Healthcare',
        'NESTLEIND': 'FMCG',
        'COALINDIA': 'Energy - Coal',
        'ONGC': 'Energy - Oil & Gas',
        'MAXHEALTH': 'Pharmaceuticals & Healthcare',
        'POWERGRID': 'Power & Utilities',
        'JSWSTEEL': 'Metals & Mining',
        'GRASIM': 'Materials',
        'ULTRACEMCO': 'Materials - Cement',
        'BAJAJFINSV': 'Financial Services',
        'SBILIFE': 'Financial Services',
        'TATACONSUM': 'FMCG',
        'CIPLA': 'Pharmaceuticals & Healthcare'
    }
    
    # Separate the NIFTY 50 index row and stock constituent rows
    index_row = df[df['SYMBOL'] == 'NIFTY 50']
    stocks_df = df[df['SYMBOL'] != 'NIFTY 50']
    
    def convert_row(row):
        return {
            'symbol': row['SYMBOL'],
            'open': float(row['OPEN']) if not pd.isna(row['OPEN']) else 0.0,
            'high': float(row['HIGH']) if not pd.isna(row['HIGH']) else 0.0,
            'low': float(row['LOW']) if not pd.isna(row['LOW']) else 0.0,
            'prevClose': float(row['PREV. CLOSE']) if not pd.isna(row['PREV. CLOSE']) else 0.0,
            'ltp': float(row['LTP']) if not pd.isna(row['LTP']) else 0.0,
            'change': float(row['CHANGE']) if not pd.isna(row['CHANGE']) else 0.0,
            'percentChange': float(row['% CHANGE']) if not pd.isna(row['% CHANGE']) else 0.0,
            'volume': int(row['VOLUME (shares)']) if not pd.isna(row['VOLUME (shares)']) else 0,
            'valueCrores': float(row['VALUE (Crores)']) if not pd.isna(row['VALUE (Crores)']) else 0.0,
            'fiftyTwoWeekHigh': float(row['52W H']) if not pd.isna(row['52W H']) else 0.0,
            'fiftyTwoWeekLow': float(row['52W L']) if not pd.isna(row['52W L']) else 0.0,
            'thirtyDayPercentChange': float(row['30 D %CHNG']) if not pd.isna(row['30 D %CHNG']) else 0.0,
            'threeSixtyFiveDayPercentChange': float(row['365 D %CHNG']) if not pd.isna(row['365 D %CHNG']) else 0.0,
        }
    
    # Process Nifty index
    if not index_row.empty:
        nifty_index_data = convert_row(index_row.iloc[0])
    else:
        nifty_index_data = {}
        
    # Process Stocks
    stocks_list = []
    for _, row in stocks_df.iterrows():
        stock_data = convert_row(row)
        sym = stock_data['symbol']
        stock_data['sector'] = sector_map.get(sym, 'Other')
        # Calculate extra useful metrics
        ltp = stock_data['ltp']
        h52 = stock_data['fiftyTwoWeekHigh']
        l52 = stock_data['fiftyTwoWeekLow']
        
        # Distance from 52W High (%)
        if h52 > 0:
            stock_data['distFrom52WHigh'] = round(((h52 - ltp) / h52) * 100, 2)
        else:
            stock_data['distFrom52WHigh'] = 0.0
            
        # Distance from 52W Low (%)
        if l52 > 0:
            stock_data['distFrom52WLow'] = round(((ltp - l52) / l52) * 100, 2)
        else:
            stock_data['distFrom52WLow'] = 0.0
            
        stocks_list.append(stock_data)
        
    # Write to data.js file
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write("// Nifty 50 Stocks Analysis Data - Generated on July 10, 2026\n\n")
        f.write(f"const niftyIndex = {json.dumps(nifty_index_data, indent=2)};\n\n")
        f.write(f"const stockData = {json.dumps(stocks_list, indent=2)};\n")
        
    print(f"Successfully generated data.js with {len(stocks_list)} stocks and Nifty Index info.")

if __name__ == '__main__':
    generate()
