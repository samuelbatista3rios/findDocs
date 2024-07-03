WITH DocumentosClassificados AS (
    SELECT D.NR_DOCUMENTO COD_DOCUMENTO,
        D.DS_PRINCIPAL_DOCUMENTO NOME_DOCUMENTO,
        FORMAT(D.DT_CRIACAO, 'dd-MM-yyyy') DT_CRIACAO,
        F.DATAADMISSAO,
        F.CODFILIAL,
        F.CHAPA,
        F.NOME,
        CASE
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '01' THEN 'ASO Admissional'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '02' THEN 'ASO Periódico'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '03' THEN 'ASO Demissional'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '04' THEN 'ASO Mudança de função'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '07' THEN 'ASO Retorno ao trabalho'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '11' THEN 'Ficha EPI'
            ELSE SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            )
        END AS TIPO_DOCUMENTO,
        F.CODSITUACAO SITUACAO,
        (
            SELECT PF.NOME
            FROM CorporeRM.dbo.PFUNCAO (NOLOCK) PF
            WHERE PF.CODIGO = F.CODFUNCAO
        ) FUNCAO,
        (
            SELECT PS.DESCRICAO
            FROM CorporeRM.dbo.PSECAO (NOLOCK) PS
            WHERE PS.CODIGO = F.CODSECAO
        ) SETOR,
        ROW_NUMBER() OVER (
            PARTITION BY F.CODFILIAL,
            F.CHAPA
            ORDER BY D.DT_CRIACAO DESC,
                D.NR_DOCUMENTO DESC
        ) AS RN
    FROM fluig.dbo.DOCUMENTO D (NOLOCK)
        JOIN CorporeRM.dbo.PFUNC (NOLOCK) F ON F.CHAPA COLLATE Latin1_General_CI_AS = RIGHT(
            REPLACE(D.DS_PRINCIPAL_DOCUMENTO, '.pdf', ''),
            CHARINDEX(
                '_',
                REVERSE(REPLACE(D.DS_PRINCIPAL_DOCUMENTO, '.pdf', ''))
            ) - 1
        )
    WHERE F.CODFILIAL = 19
        AND D.VERSAO_ATIVA = 1
        --AND DT_CRIACAO BETWEEN '2023-05-01' AND '2024-06-30'
		AND DATAADMISSAO BETWEEN '2023-05-01' AND '2024-06-30'
        AND LEN(DS_PRINCIPAL_DOCUMENTO) = 31
        AND DS_PRINCIPAL_DOCUMENTO LIKE '%%_05.11%'
        AND CASE
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '01' THEN 'ASO Admissional'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '02' THEN 'ASO Periódico'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '03' THEN 'ASO Demissional'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '04' THEN 'ASO Mudança de função'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '07' THEN 'ASO Retorno ao trabalho'
            WHEN SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            ) = '11' THEN 'Ficha EPI'
            ELSE SUBSTRING(
                D.DS_PRINCIPAL_DOCUMENTO,
                CHARINDEX('_05.', D.DS_PRINCIPAL_DOCUMENTO) + LEN('_05.'),
                2
            )
        END = 'Ficha EPI'
)
SELECT COD_DOCUMENTO,
    NOME_DOCUMENTO,
    DT_CRIACAO,
    FORMAT(DATAADMISSAO, 'dd-MM-yyyy') DATAADMISSAO,
    CODFILIAL,
    CHAPA,
    NOME,
    TIPO_DOCUMENTO,
    SITUACAO,
    FUNCAO,
    SETOR
FROM DocumentosClassificados
WHERE RN = 1