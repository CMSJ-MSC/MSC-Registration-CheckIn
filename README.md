# MSC Registration Check-In Page

<img width="1439" alt="Screenshot 2025-06-20 at 2 05 45 AM" src="https://github.com/user-attachments/assets/4868ac9e-9060-4418-9c43-c03a3077a691" />


Data Cleaning Pipeline
- Save new downloaded csv as "participants.csv" in /data/raw/participants.csv
- Run clean.ipynb --> saved as cff_participants_cleaned.ipynb
- Run update.ipynb --> saved as participants3_cleaned.ipynb
- Run make start



## Data Cleaning Pipeline

1. **Save CSV File**  
   Save the newly downloaded file as: `/data/raw/participants.csv`
2. **Run `/clean.ipynb`**
    Cleans raw data and outputs:  `cff_participants_cleaned.ipynb`
3. **Run `/live-version/update.ipynb`**  
    Applies additional updates and outputs:  `participants3_cleaned.ipynb`
4. **Start the Application**  
Run the following command:  `make start`