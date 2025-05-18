import {Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';
import {IMUDataRow, IMURecording} from '../types/type.d';

class ExcelService {
  private static instance: ExcelService;
  private recordedSessions: IMURecording[] = [];
  private fileName = 'IMU_Fall_Data.xlsx';
  private filePath = `${RNFS.CachesDirectoryPath}/${this.fileName}`;

  public static getInstance(): ExcelService {
    if (!ExcelService.instance) {
      ExcelService.instance = new ExcelService();
    }
    return ExcelService.instance;
  }

  public addRecordingSession(session: IMURecording): void {
    this.recordedSessions.push(session);
  }

  public getRecordedSessionsCount(): number {
    return this.recordedSessions.length;
  }

  private async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];
        const grants = await PermissionsAndroid.requestMultiple(permissions);

        const writeGranted =
          grants[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const readGranted =
          grants[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (writeGranted && readGranted) {
          console.log('Storage permissions granted');
          return true;
        } else {
          console.log(
            'Storage permissions denied. Write:',
            writeGranted,
            'Read:',
            readGranted,
          );
          if (!writeGranted) console.warn('Write permission denied by user.');
          if (!readGranted) console.warn('Read permission denied by user.');
          return false;
        }
      } catch (err) {
        console.warn('Error requesting storage permissions:', err);
        return false;
      }
    }
    return true;
  }

  public async saveToExcel(): Promise<string | null> {
    const hasPermission = await this.requestStoragePermission();
    if (Platform.OS === 'android' && !hasPermission) {
      console.warn(
        'External storage permission denied, but attempting to write to cache for sharing.',
      );
    }

    if (this.recordedSessions.length === 0) {
      console.log('No data to save.');
      throw new Error('No data to save to Excel.');
    }

    const dataForSheet: IMUDataRow[] = this.recordedSessions.map(session => ({
      ax: session.axData.join(','),
      ay: session.ayData.join(','),
      az: session.azData.join(','),
      gx: session.gxData.join(','),
      gy: session.gyData.join(','),
      gz: session.gzData.join(','),
      classification: session.isFall,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IMU Data');

    const wbout = XLSX.write(workbook, {type: 'binary', bookType: 'xlsx'});

    try {
      await RNFS.writeFile(this.filePath, wbout, 'ascii');
      console.log(`Excel file saved to cache: ${this.filePath}`);
      return this.filePath;
    } catch (e) {
      console.error('Error writing file:', e);
      throw new Error('Failed to write Excel file.');
    }
  }
}

export default ExcelService.getInstance();
